import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cpu, Plug, Upload, Search, Download, Terminal, Library, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BOARDS, detectBoardByUsb, findBoardById, type BoardDescriptor } from '@/lang/hardware/board-db';
import { extractBoardBlock, transpileBoard } from '@/lang/hardware/transpile';
import {
  isWebSerialSupported, requestSerialPort, getGrantedPorts,
  flashAvr, parseIntelHex, openSerialMonitor, type WebSerialPort, type FlashProgress,
} from '@/lang/hardware/web-serial';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  source: string;
  onAppendLog: (line: string) => void;
}

type Status = 'idle' | 'busy' | 'ok' | 'error';

interface CompileResult {
  ok?: boolean;
  reason?: string;
  message?: string;
  error?: string;
  log?: string;
  hex?: string;
  format?: string;
  ino?: string;
}

const DEFAULT_BUILD_URL = 'http://localhost:8765';


export function HardwarePanel({ source, onAppendLog }: Props) {
  const [boardId, setBoardId] = useState<string>(() => localStorage.getItem('sdev.hw.board') ?? 'uno');
  const [port, setPort] = useState<WebSerialPort | null>(null);
  const [portInfo, setPortInfo] = useState<string>('no port');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<FlashProgress | null>(null);
  const [hexCache, setHexCache] = useState<string | null>(null);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const monitorAbort = useRef<AbortController | null>(null);
  const [baud, setBaud] = useState(9600);
  const [librariesOpen, setLibrariesOpen] = useState(false);
  const [buildUrl, setBuildUrl] = useState<string>(() => localStorage.getItem('sdev.hw.buildUrl') ?? DEFAULT_BUILD_URL);
  const [buildOk, setBuildOk] = useState<boolean | null>(null);


  const board = useMemo(() => findBoardById(boardId)!, [boardId]);
  const block = useMemo(() => extractBoardBlock(source), [source]);
  const transpiled = useMemo(() => block ? transpileBoard(block, board) : null, [block, board]);

  useEffect(() => { localStorage.setItem('sdev.hw.board', boardId); }, [boardId]);
  useEffect(() => { localStorage.setItem('sdev.hw.buildUrl', buildUrl); setBuildOk(null); }, [buildUrl]);


  // Try to re-attach a previously granted port on mount.
  useEffect(() => {
    if (!isWebSerialSupported()) return;
    getGrantedPorts().then(ports => {
      if (ports.length && !port) {
        const p = ports[0];
        setPort(p);
        const i = p.getInfo();
        if (i.usbVendorId && i.usbProductId) {
          const guess = detectBoardByUsb(i.usbVendorId, i.usbProductId);
          setPortInfo(`${guess?.label ?? 'unknown'} (${hex4(i.usbVendorId)}:${hex4(i.usbProductId)})`);
        }
      }
    });
  }, [port]);

  const detect = useCallback(async () => {
    try {
      const p = await requestSerialPort();
      setPort(p);
      const i = p.getInfo();
      if (i.usbVendorId !== undefined && i.usbProductId !== undefined) {
        const guess = detectBoardByUsb(i.usbVendorId, i.usbProductId);
        setPortInfo(`${guess?.label ?? 'unknown device'} (${hex4(i.usbVendorId)}:${hex4(i.usbProductId)})`);
        if (guess) { setBoardId(guess.id); toast.success(`Detected: ${guess.label}`); }
        else toast.message('Port selected, board unknown — pick manually below.');
      } else {
        setPortInfo('port selected');
      }
    } catch (e) {
      if ((e as Error).name !== 'NotFoundError') toast.error(String(e));
    }
  }, []);

  /** Try the user's own build server (localhost or self-hosted) first. */
  const compileViaBuildServer = useCallback(async (url: string): Promise<CompileResult> => {
    const res = await fetch(url.replace(/\/+$/, '') + '/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fqbn: board.fqbn, ino: transpiled!.ino, libraries: transpiled!.libraries }),
    });
    return (await res.json()) as CompileResult;
  }, [board, transpiled]);

  const compile = useCallback(async (): Promise<string | null> => {
    if (!transpiled) { toast.error('No `board "<id>" { ... }` block found in this file.'); return null; }
    setStatus('busy');
    onAppendLog(`[hw] compiling for ${board.fqbn}…`);

    // 1) Local / self-hosted arduino-cli bridge.
    if (buildUrl.trim()) {
      try {
        const r = await compileViaBuildServer(buildUrl.trim());
        if (r.ok && r.hex) {
          setHexCache(r.hex); setStatus('ok');
          onAppendLog(`[hw] compiled OK via ${buildUrl} (${r.hex.length} bytes ${r.format})`);
          return r.hex;
        }
        setStatus('error');
        onAppendLog(`[hw] build server error: ${r.error ?? r.message ?? 'unknown'}`);
        if (r.log) onAppendLog(r.log);
        toast.error(r.error ?? r.message ?? 'Build failed');
        return null;
      } catch (e) {
        onAppendLog(`[hw] build server unreachable at ${buildUrl} (${(e as Error).message}) — trying hosted builder…`);
      }
    }

    // 2) Hosted builder via the backend function.
    try {
      const { data, error } = await supabase.functions.invoke('compile-firmware', {
        body: { fqbn: board.fqbn, ino: transpiled.ino, libraries: transpiled.libraries },
      });
      if (error) throw new Error(error.message);
      const r = data as CompileResult;
      if (r.ok && r.hex) {
        setHexCache(r.hex); setStatus('ok');
        onAppendLog(`[hw] compiled OK (${r.hex.length} bytes ${r.format})`);
        return r.hex;
      }
      if (r.reason === 'build_unavailable') {
        setStatus('error');
        onAppendLog('[hw] No build server reachable. Start the local one:');
        onAppendLog('[hw]   node tools/arduino-build-server/server.mjs   (needs arduino-cli)');
        onAppendLog('[hw] then set its URL in Hardware → Build server. The .ino was downloaded meanwhile.');
        toast.error('No build server reachable — see the log for the one-line setup.');
        downloadText(`${board.id}.ino`, r.ino ?? transpiled.ino);
        return null;
      }
      throw new Error(r.message || r.error || 'compile failed');
    } catch (e) {
      setStatus('error');
      onAppendLog(`[hw] compile error: ${(e as Error).message}`);
      toast.error((e as Error).message);
      return null;
    }
  }, [transpiled, board, onAppendLog, buildUrl, compileViaBuildServer]);

  const testBuildServer = useCallback(async () => {
    if (!buildUrl.trim()) { toast.error('Enter a build server URL first.'); return; }
    try {
      const res = await fetch(buildUrl.replace(/\/+$/, '') + '/');
      const j = await res.json() as { ok?: boolean; arduinoCli?: string; error?: string };
      if (j.ok) { setBuildOk(true); toast.success(`Build server ready — ${j.arduinoCli}`); onAppendLog(`[hw] build server OK: ${j.arduinoCli}`); }
      else { setBuildOk(false); toast.error(j.error ?? 'Build server not ready'); onAppendLog(`[hw] ${j.error}`); }
    } catch (e) {
      setBuildOk(false);
      toast.error('Build server unreachable — run: node tools/arduino-build-server/server.mjs');
      onAppendLog(`[hw] build server unreachable: ${(e as Error).message}`);
    }
  }, [buildUrl, onAppendLog]);


  const upload = useCallback(async () => {
    if (!port) { toast.error('No port — click Detect Board first.'); return; }
    const hex = hexCache ?? await compile();
    if (!hex) return;
    if (board.uploader !== 'avrdude-stk500') {
      toast.message(`${board.uploader} flashing isn't wired in this build yet — download the firmware and use the vendor tool.`);
      const { data } = parseIntelHex(hex);
      const ab = new ArrayBuffer(data.length);
      new Uint8Array(ab).set(data);
      const blob = new Blob([ab], { type: 'application/octet-stream' });
      triggerDownload(blob, `${board.id}.bin`);
      return;
    }
    setStatus('busy'); setProgress(null);
    onAppendLog(`[hw] uploading to ${board.label}…`);
    try {
      await flashAvr(port, hex, (p) => { setProgress(p); if (p.phase === 'write') onAppendLog(`[hw] write ${p.written}/${p.total}`); });
      setStatus('ok'); onAppendLog('[hw] upload complete ✓');
      toast.success('Uploaded to board');
    } catch (e) {
      setStatus('error'); onAppendLog(`[hw] upload error: ${(e as Error).message}`);
      toast.error((e as Error).message);
    }
  }, [port, hexCache, compile, board, onAppendLog]);

  const toggleMonitor = useCallback(async () => {
    if (monitorOpen) {
      monitorAbort.current?.abort(); monitorAbort.current = null; setMonitorOpen(false); return;
    }
    if (!port) { toast.error('No port'); return; }
    const ctl = new AbortController(); monitorAbort.current = ctl; setMonitorOpen(true);
    onAppendLog(`[serial] monitor open @ ${baud} baud`);
    try {
      await openSerialMonitor(port, baud, (text) => onAppendLog(text.replace(/\r/g, '').replace(/\n$/, '')), ctl.signal);
    } catch (e) { onAppendLog(`[serial] ${(e as Error).message}`); }
    finally { setMonitorOpen(false); onAppendLog('[serial] monitor closed'); }
  }, [monitorOpen, port, baud, onAppendLog]);

  const supported = isWebSerialSupported();

  return (
    <div className="h-full flex flex-col text-xs text-foreground">
      <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
        <Cpu className="w-4 h-4 text-primary" />
        <span className="font-semibold tracking-wide">Hardware</span>
      </div>

      <div className="p-3 space-y-3 overflow-auto">
        {!supported && (
          <div className="rounded border border-yellow-500/40 bg-yellow-500/10 p-2 flex gap-2 text-yellow-200">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div>Web Serial isn't available in this browser. Use Chrome, Edge or Opera on desktop.</div>
          </div>
        )}

        <section className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Board</label>
          <Select value={boardId} onValueChange={setBoardId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BOARDS.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground font-mono">{board.fqbn} · {board.mcu}</p>
        </section>

        <section className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Port</label>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={detect} className="gap-1.5 h-7 text-xs flex-1" disabled={!supported}>
              <Search className="w-3 h-3" /> Detect board
            </Button>
            <Button size="sm" variant="ghost" onClick={() => getGrantedPorts().then(ps => toast.message(`${ps.length} granted port(s)`))} className="h-7 px-2">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] font-mono ${port ? 'text-emerald-400' : 'text-muted-foreground'}`}>
            <Plug className="w-3 h-3" />{portInfo}
          </div>
        </section>

        <section className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sketch</label>
          {block
            ? <p className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> board block found ({transpiled?.libraries.length ?? 0} libs)</p>
            : <p className="text-[11px] text-muted-foreground">no <code>board "&lt;id&gt;" {'{}'}</code> block in current file</p>}

          <div className="grid grid-cols-2 gap-1.5">
            <Button size="sm" onClick={() => compile()} disabled={!block || status === 'busy'} className="h-7 text-xs gap-1.5">
              <Cpu className="w-3 h-3" /> Compile
            </Button>
            <Button size="sm" onClick={upload} disabled={!block || !port || status === 'busy'} className="h-7 text-xs gap-1.5">
              <Upload className="w-3 h-3" /> Upload
            </Button>
          </div>

          {progress && progress.phase === 'write' && progress.total && (
            <div className="h-1.5 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${(100 * (progress.written ?? 0) / progress.total).toFixed(1)}%` }} />
            </div>
          )}

          <Button size="sm" variant="ghost" onClick={() => transpiled && downloadText(`${board.id}.ino`, transpiled.ino)} disabled={!transpiled} className="h-7 w-full text-xs gap-1.5 justify-start text-muted-foreground">
            <Download className="w-3 h-3" /> Export .ino
          </Button>
        </section>

        <section className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Build server</label>
          <div className="flex gap-1.5">
            <input
              value={buildUrl}
              onChange={(e) => setBuildUrl(e.target.value)}
              placeholder={DEFAULT_BUILD_URL}
              spellCheck={false}
              className="h-7 flex-1 rounded border border-border/60 bg-background px-2 text-[11px] font-mono outline-none focus:border-primary"
            />
            <Button size="sm" variant="outline" onClick={testBuildServer} className="h-7 px-2 text-xs">Test</Button>
          </div>
          <p className={`text-[10px] ${buildOk === true ? 'text-emerald-400' : buildOk === false ? 'text-red-400' : 'text-muted-foreground'}`}>
            {buildOk === true
              ? 'arduino-cli bridge reachable — Compile & Upload are live.'
              : <>Run <code className="font-mono">node tools/arduino-build-server/server.mjs</code> locally (needs arduino-cli), or point this at a hosted bridge.</>}
          </p>
        </section>



        <section className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Serial monitor</label>
          <div className="flex gap-1.5">
            <Select value={String(baud)} onValueChange={(v) => setBaud(parseInt(v))}>
              <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 500000, 1000000].map(b =>
                  <SelectItem key={b} value={String(b)} className="text-xs">{b} baud</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant={monitorOpen ? 'default' : 'outline'} onClick={toggleMonitor} disabled={!port} className="h-7 text-xs gap-1.5">
              <Terminal className="w-3 h-3" /> {monitorOpen ? 'Stop' : 'Open'}
            </Button>
          </div>
        </section>

        <section className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Libraries</label>
          <Button size="sm" variant="outline" onClick={() => setLibrariesOpen(o => !o)} className="h-7 w-full text-xs gap-1.5 justify-start">
            <Library className="w-3 h-3" /> Library manager
          </Button>
          {librariesOpen && <LibrariesPanel board={board} usedInSketch={transpiled?.libraries ?? []} />}
        </section>
      </div>
    </div>
  );
}

// --------------------------------------------------------------
// Library manager — fed by Arduino's public index JSON.
// --------------------------------------------------------------
interface IndexedLibrary { name: string; latest: string; sentence?: string; paragraph?: string; types?: string[] }

function LibrariesPanel({ board, usedInSketch }: { board: BoardDescriptor; usedInSketch: string[] }) {
  const [libs, setLibs] = useState<IndexedLibrary[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [installed, setInstalled] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('sdev.hw.libs') ?? '[]'); }
    catch { return []; }
  });
  useEffect(() => { localStorage.setItem('sdev.hw.libs', JSON.stringify(installed)); }, [installed]);

  useEffect(() => {
    if (libs.length) return;
    setLoading(true);
    fetch('https://downloads.arduino.cc/libraries/library_index.json')
      .then(r => r.json())
      .then((j: { libraries: { name: string; version: string; sentence?: string; paragraph?: string; types?: string[] }[] }) => {
        const byName = new Map<string, IndexedLibrary>();
        for (const l of j.libraries) {
          const existing = byName.get(l.name);
          if (!existing || cmpVer(l.version, existing.latest) > 0) {
            byName.set(l.name, { name: l.name, latest: l.version, sentence: l.sentence, paragraph: l.paragraph, types: l.types });
          }
        }
        setLibs([...byName.values()].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(e => toast.error(`Failed to load Arduino library index: ${(e as Error).message}`))
      .finally(() => setLoading(false));
  }, [libs.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? libs.filter(l => l.name.toLowerCase().includes(q) || (l.sentence ?? '').toLowerCase().includes(q)) : libs;
    return base.slice(0, 80);
  }, [libs, query]);

  return (
    <div className="rounded border border-border/50 bg-muted/20 p-2 space-y-2">
      <input
        value={query} onChange={e => setQuery(e.target.value)}
        placeholder={`Search ${libs.length} libraries…`}
        className="w-full h-7 px-2 rounded bg-background border border-border/50 text-xs"
      />
      {loading && <p className="text-[11px] text-muted-foreground">loading index…</p>}
      <div className="max-h-64 overflow-auto space-y-1">
        {filtered.map(l => {
          const isInstalled = installed.includes(l.name);
          const isUsed = usedInSketch.includes(l.name);
          return (
            <div key={l.name} className="flex items-start gap-2 p-1.5 rounded hover:bg-muted/50">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono truncate flex items-center gap-1.5">
                  {l.name}
                  <span className="text-[9px] text-muted-foreground">{l.latest}</span>
                  {isUsed && <span className="text-[9px] text-primary">·used</span>}
                </div>
                {l.sentence && <div className="text-[10px] text-muted-foreground line-clamp-2">{l.sentence}</div>}
              </div>
              <Button
                size="sm" variant={isInstalled ? 'secondary' : 'outline'}
                className="h-6 px-2 text-[10px]"
                onClick={() => setInstalled(s => isInstalled ? s.filter(n => n !== l.name) : [...s, l.name])}
              >
                {isInstalled ? 'Remove' : 'Install'}
              </Button>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && <p className="text-[11px] text-muted-foreground p-2">no matches</p>}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Installed libraries are sent to the build server with each compile for {board.fqbn}. Reference them in your sketch with <code>use "&lt;Name&gt;"</code>.
      </p>
    </div>
  );
}

function cmpVer(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n) || 0);
  const pb = b.split('.').map(n => parseInt(n) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}
function hex4(n: number): string { return n.toString(16).padStart(4, '0'); }
function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  triggerDownload(blob, name);
}
function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
