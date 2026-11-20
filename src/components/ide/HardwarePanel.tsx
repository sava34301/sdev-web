import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Cpu, Plug, Upload, Search, Download, Terminal, Library, RefreshCw,
  CheckCircle2, AlertTriangle, Code2, Copy, Send, BookOpen, Cloud, Server, Sparkles,
} from 'lucide-react';
import {
  BOARDS, detectBoardByUsb, findBoardById, canFlashInBrowser, canCompileInCloud,
  type BoardDescriptor,
} from '@/lang/hardware/board-db';
import { extractBoardBlock, transpileBoard } from '@/lang/hardware/transpile';
import { readBoards } from '@/lang/hardware/understand';
import { ARDUINO_LIBRARIES, type ArduinoLibrary } from '@/lang/hardware/arduino-api';
import {
  isWebSerialSupported, isWebUsbSupported, requestSerialPort, getGrantedPorts,
  flashBoard, buildUf2FromHexOrBin, parseIntelHex, openSerialMonitor, sendSerialText,
  type WebSerialPort, type FlashProgress,
} from '@/lang/hardware/web-serial';
import { compileSketch } from '@/lang/hardware/cloud-compile';
import { HardwareSimulatorCanvas } from '@/components/ide/HardwareSimulatorCanvas';
import { toast } from 'sonner';

interface Props {
  source: string;
  onAppendLog: (line: string) => void;
  onInsertCode?: (snippet: string) => void;
}

type Status = 'idle' | 'busy' | 'ok' | 'error';

const DEFAULT_BUILD_URL = 'http://localhost:8765';

export function HardwarePanel({ source, onAppendLog, onInsertCode }: Props) {
  const [boardId, setBoardId] = useState<string>(() => localStorage.getItem('sdev.hw.board') ?? 'uno');
  const [port, setPort] = useState<WebSerialPort | null>(null);
  const [portInfo, setPortInfo] = useState<string>('no port');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<FlashProgress | null>(null);
  const [hexCache, setHexCache] = useState<string | null>(null);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const monitorAbort = useRef<AbortController | null>(null);
  const [baud, setBaud] = useState(9600);
  const [serialInput, setSerialInput] = useState('');
  const [librariesOpen, setLibrariesOpen] = useState(false);
  const [cppPreviewOpen, setCppPreviewOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(true);
  const [buildUrl, setBuildUrl] = useState<string>(() => localStorage.getItem('sdev.hw.buildUrl') ?? DEFAULT_BUILD_URL);
  const [buildOk, setBuildOk] = useState<boolean | null>(null);

  // The code understander reads the board block first: loose lines ("turn on
  // the led", "wait one second", `loop:` with no `;;`) become the hardware
  // language; lines it already knows stay exactly as written.
  const agentOff = useMemo(() => /^\s*!#agent:\s*off\b/im.test(source), [source]);
  const reading = useMemo(() => (agentOff ? null : readBoards(source)), [source, agentOff]);
  const [aiReading, setAiReading] = useState<{ for: string; text: string; read: number } | null>(null);
  const understoodSource = aiReading?.for === source ? aiReading.text : reading?.source ?? source;
  const unresolvedLines = aiReading?.for === source ? [] : reading?.unresolved ?? [];
  const block = useMemo(() => extractBoardBlock(understoodSource), [understoodSource]);

  // Automatically select the board declared in `board "<id>"` when valid
  useEffect(() => {
    if (block?.boardId && findBoardById(block.boardId) && block.boardId !== boardId) {
      setBoardId(block.boardId);
    }
  }, [block?.boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  const board = useMemo(() => findBoardById(boardId) ?? BOARDS[0], [boardId]);
  const transpiled = useMemo(() => (block ? transpileBoard(block, board) : null), [block, board]);

  // Clear cached firmware when source or target board changes
  useEffect(() => {
    setHexCache(null);
  }, [transpiled?.ino, board.fqbn]);

  useEffect(() => {
    localStorage.setItem('sdev.hw.board', boardId);
  }, [boardId]);

  useEffect(() => {
    localStorage.setItem('sdev.hw.buildUrl', buildUrl);
    setBuildOk(null);
  }, [buildUrl]);

  // Re-attach a previously granted port on mount.
  useEffect(() => {
    if (!isWebSerialSupported()) return;
    getGrantedPorts().then((ports) => {
      if (ports.length && !port) {
        const p = ports[0];
        setPort(p);
        const i = p.getInfo();
        if (i.usbVendorId && i.usbProductId) {
          const guess = detectBoardByUsb(i.usbVendorId, i.usbProductId);
          setPortInfo(`${guess?.label ?? 'USB device'} (${hex4(i.usbVendorId)}:${hex4(i.usbProductId)})`);
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
        if (guess) {
          setBoardId(guess.id);
          toast.success(`Detected: ${guess.label}`);
        } else {
          toast.message('Port selected, board unknown — pick manually below.');
        }
      } else {
        setPortInfo('port selected');
      }
    } catch (e) {
      if ((e as Error).name !== 'NotFoundError') toast.error(String(e));
    }
  }, []);

  const getInstalledLibs = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem('sdev.hw.libs') ?? '[]');
    } catch {
      return [];
    }
  };

  const compile = useCallback(async (): Promise<string | null> => {
    let sketch = transpiled;
    if (reading?.notes.length) {
      for (const n of reading.notes) {
        onAppendLog(n.from ? `[hw] understood line ${n.line}: ${n.from}  →  ${n.to}` : `[hw] understood: ${n.why}`);
      }
    }
    if (unresolvedLines.length && !agentOff) {
      onAppendLog(`[hw] asking the code understander's AI about line${unresolvedLines.length === 1 ? '' : 's'} ${unresolvedLines.join(', ')}…`);
      setStatus('busy');
      try {
        const { understandAsync } = await import('@/lang/agent');
        const r = await understandAsync(source);
        const aiBlock = extractBoardBlock(r.source);
        const left = r.unresolved.filter((n) => unresolvedLines.includes(n));
        if (aiBlock && left.length < unresolvedLines.length) {
          setAiReading({ for: source, text: r.source, read: unresolvedLines.length - left.length });
          sketch = transpileBoard(aiBlock, board);
          onAppendLog(`[hw] the AI understood ${unresolvedLines.length - left.length} more line${unresolvedLines.length - left.length === 1 ? '' : 's'}`);
        }
        if (left.length) onAppendLog(`[hw] still not understood: line${left.length === 1 ? '' : 's'} ${left.join(', ')} — passed to the compiler as written`);
      } catch (e) {
        onAppendLog(`[hw] the AI could not help: ${(e as Error).message}`);
      }
    }
    if (!sketch) {
      toast.error('No `board "<id>" { ... }` or `board "<id>" :: ... ;;` block found in this file.');
      return null;
    }
    setStatus('busy');
    const allLibs = [...new Set([...sketch.libraries, ...getInstalledLibs()])];
    onAppendLog(`[hw] compiling for ${board.label} (${board.fqbn})…`);

    const r = await compileSketch({
      board,
      ino: sketch.ino,
      libraries: allLibs,
      buildUrl: buildUrl.trim() || undefined,
      onLog: onAppendLog,
    });

    if (r.ok && r.hex) {
      setHexCache(r.hex);
      setStatus('ok');
      const via =
        r.provider === 'wokwi-cloud'
          ? 'cloud compiler (zero-install)'
          : r.provider === 'local-cli'
          ? `local arduino-cli (${buildUrl})`
          : 'hosted builder';
      onAppendLog(`[hw] compiled OK via ${via} (${r.hex.length} chars ${r.format ?? 'ihex'})`);
      if (r.log) onAppendLog(r.log);
      toast.success(`Compiled for ${board.label}`);
      return r.hex;
    }

    setStatus('error');
    if (r.reason === 'build_unavailable') {
      if (board.id === 'uno-q') {
        onAppendLog('[hw] Arduino Uno Q runs Linux + Zephyr MCU and uses Arduino App Lab.');
        onAppendLog('[hw] Exporting .ino so you can open it directly in Arduino App Lab.');
      } else {
        onAppendLog(`[hw] ${board.label} requires the local arduino-cli build server:`);
        onAppendLog('[hw]   node tools/arduino-build-server/server.mjs   (needs arduino-cli)');
        onAppendLog('[hw] The generated .ino has been downloaded meanwhile.');
      }
      toast.error(r.message ?? 'Local arduino-cli build server required for this board — .ino exported.');
      downloadText(`${board.id}.ino`, r.ino ?? sketch.ino);
      return null;
    }

    const msg = r.error ?? r.message ?? 'Compilation failed';
    onAppendLog(`[hw] compile error: ${msg}`);
    if (r.log) onAppendLog(r.log);
    toast.error(msg);
    return null;
  }, [transpiled, board, onAppendLog, buildUrl, reading, unresolvedLines, agentOff, source]);

  const testBuildServer = useCallback(async () => {
    if (!buildUrl.trim()) {
      toast.error('Enter a build server URL first.');
      return;
    }
    try {
      const res = await fetch(buildUrl.replace(/\/+$/, '') + '/');
      const j = (await res.json()) as { ok?: boolean; arduinoCli?: string; error?: string };
      if (j.ok) {
        setBuildOk(true);
        toast.success(`Build server ready — ${j.arduinoCli}`);
        onAppendLog(`[hw] build server OK: ${j.arduinoCli}`);
      } else {
        setBuildOk(false);
        toast.error(j.error ?? 'Build server not ready');
        onAppendLog(`[hw] ${j.error}`);
      }
    } catch (e) {
      setBuildOk(false);
      toast.error('Build server unreachable — run: node tools/arduino-build-server/server.mjs');
      onAppendLog(`[hw] build server unreachable: ${(e as Error).message}`);
    }
  }, [buildUrl, onAppendLog]);

  const needsSerialPort = board.uploader !== 'uf2' && board.uploader !== 'dfu';

  const upload = useCallback(async () => {
    if (!canFlashInBrowser(board)) {
      if (transpiled) {
        downloadText(`${board.id}.ino`, transpiled.ino);
        toast.message(`${board.label} uses ${board.uploader === 'app-lab' ? 'Arduino App Lab' : 'vendor CLI'}. Exported ${board.id}.ino.`);
      }
      return;
    }
    if (needsSerialPort && !port) {
      toast.error('No serial port — click Detect board first.');
      return;
    }
    const hex = hexCache ?? (await compile());
    if (!hex) return;

    // Close serial monitor if open so the uploader can claim the port
    if (monitorOpen) {
      monitorAbort.current?.abort();
      monitorAbort.current = null;
      setMonitorOpen(false);
    }

    setStatus('busy');
    setProgress(null);
    onAppendLog(`[hw] uploading to ${board.label} via ${board.uploader}…`);
    try {
      await flashBoard(board, port, hex, (p) => {
        setProgress(p);
        if (p.phase === 'write' && p.written !== undefined && p.total !== undefined) {
          onAppendLog(`[hw] write ${p.written}/${p.total} bytes`);
        }
      });
      setStatus('ok');
      onAppendLog('[hw] upload complete ✓');
      toast.success(`Uploaded to ${board.label}`);
    } catch (e) {
      setStatus('error');
      onAppendLog(`[hw] upload error: ${(e as Error).message}`);
      toast.error((e as Error).message);
    }
  }, [board, needsSerialPort, port, hexCache, compile, monitorOpen, onAppendLog, transpiled]);

  const exportFirmware = useCallback(() => {
    if (!hexCache) return;
    if (board.uploader === 'uf2') {
      const uf2 = buildUf2FromHexOrBin(hexCache);
      const ab = new ArrayBuffer(uf2.length);
      new Uint8Array(ab).set(uf2);
      triggerDownload(new Blob([ab], { type: 'application/octet-stream' }), `${board.id}.uf2`);
      return;
    }
    if (hexCache.trim().startsWith(':')) {
      downloadText(`${board.id}.hex`, hexCache);
    } else {
      const { data } = parseIntelHex(hexCache);
      const ab = new ArrayBuffer(data.length);
      new Uint8Array(ab).set(data);
      triggerDownload(new Blob([ab], { type: 'application/octet-stream' }), `${board.id}.bin`);
    }
  }, [hexCache, board]);

  const toggleMonitor = useCallback(async () => {
    if (monitorOpen) {
      monitorAbort.current?.abort();
      monitorAbort.current = null;
      setMonitorOpen(false);
      return;
    }
    if (!port) {
      toast.error('No port selected');
      return;
    }
    const ctl = new AbortController();
    monitorAbort.current = ctl;
    setMonitorOpen(true);
    onAppendLog(`[serial] monitor open @ ${baud} baud`);
    try {
      await openSerialMonitor(
        port,
        baud,
        (text) => onAppendLog(text.replace(/\r/g, '').replace(/\n$/, '')),
        ctl.signal
      );
    } catch (e) {
      onAppendLog(`[serial] ${(e as Error).message}`);
    } finally {
      setMonitorOpen(false);
      onAppendLog('[serial] monitor closed');
    }
  }, [monitorOpen, port, baud, onAppendLog]);

  const handleSendSerial = useCallback(async () => {
    if (!port || !monitorOpen || !serialInput) return;
    try {
      await sendSerialText(port, serialInput + '\n');
      onAppendLog(`[serial →] ${serialInput}`);
      setSerialInput('');
    } catch (e) {
      toast.error(`Serial write failed: ${(e as Error).message}`);
    }
  }, [port, monitorOpen, serialInput, onAppendLog]);

  const serialSupported = isWebSerialSupported();
  const usbSupported = isWebUsbSupported();
  const cloudReady = canCompileInCloud(board);
  const browserFlashable = canFlashInBrowser(board);

  return (
    <div className="h-full flex flex-col text-xs text-foreground">
      <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          <span className="font-semibold tracking-wide">Hardware</span>
          <span className="text-[10px] text-muted-foreground font-mono">({BOARDS.length} boards)</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => window.open('/documentation/07-domains/hardware-and-boards.md', '_blank')}
          title="Open Hardware Reference Documentation"
        >
          <BookOpen className="w-3 h-3" /> Docs
        </Button>
      </div>

      <div className="p-3 space-y-3 overflow-auto">
        {!serialSupported && !usbSupported && (
          <div className="rounded border border-yellow-500/40 bg-yellow-500/10 p-2 flex gap-2 text-yellow-200">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div>Web Serial & WebUSB require Chrome, Edge, or Opera on desktop. Cloud compile & UF2/.ino export still work.</div>
          </div>
        )}

        {/* Board selector */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Board</label>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
              {cloudReady ? (
                <><Cloud className="w-2.5 h-2.5 text-emerald-400" /> Cloud + CLI</>
              ) : (
                <><Server className="w-2.5 h-2.5 text-amber-400" /> Local CLI</>
              )}
              {' · '}
              {board.uploader}
            </span>
          </div>
          <Select value={boardId} onValueChange={setBoardId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {BOARDS.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs">
                  {b.label} <span className="text-muted-foreground font-mono text-[10px]">({b.id})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground font-mono">
            {board.fqbn} · {board.mcu} · {board.flashKb}KB Flash / {board.ramKb}KB RAM
          </p>
          {board.notes && (
            <div className="rounded border border-primary/30 bg-primary/5 p-2 text-[10px] text-muted-foreground">
              {board.notes}
            </div>
          )}
        </section>

        {/* Port / Transport */}
        <section className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {board.uploader === 'uf2'
              ? 'RP2040 UF2 Mass Storage'
              : board.uploader === 'dfu'
              ? 'WebUSB DFU Bootloader'
              : 'Serial Port'}
          </label>
          {board.uploader === 'uf2' ? (
            <p className="text-[10px] text-muted-foreground">
              Hold <strong>BOOTSEL</strong> while plugging in your {board.label}, then click <strong>Upload</strong> to write or download the <code>.uf2</code> image directly to the <code>RPI-RP2</code> drive.
            </p>
          ) : board.uploader === 'dfu' ? (
            <p className="text-[10px] text-muted-foreground">
              Double-tap <strong>RESET</strong> to enter DFU mode, then click <strong>Upload</strong> to select the board via WebUSB DFU 1.1.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={detect}
                  className="gap-1.5 h-7 text-xs flex-1"
                  disabled={!serialSupported}
                >
                  <Search className="w-3 h-3" /> Detect board
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => getGrantedPorts().then((ps) => toast.message(`${ps.length} granted port(s)`))}
                  className="h-7 px-2"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
              <div className={`flex items-center gap-1.5 text-[11px] font-mono ${port ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                <Plug className="w-3 h-3" />
                {portInfo}
              </div>
            </>
          )}
        </section>

        {/* Sketch Compile / Upload / Preview */}
        <section className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sketch</label>
          {block ? (
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>
                <code>board "{block.boardId}"</code> block active ({transpiled?.libraries.length ?? 0} libs)
              </span>
            </p>
          ) : reading?.hasBoard ? (
            <p className="text-[11px] text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>The board block could not be read — check its <code>;;</code> / <code>{'}'}</code> closers.</span>
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No <code>board "&lt;id&gt;" :: ... ;;</code> or <code>{'{ ... }'}</code> block in current file
            </p>
          )}

          {block && (reading?.notes.length || aiReading?.for === source) ? (
            <p className="text-[11px] text-primary flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>
                Code understander read {reading?.notes.filter((n) => n.from).length ?? 0} line{(reading?.notes.filter((n) => n.from).length ?? 0) === 1 ? '' : 's'}
                {aiReading?.for === source ? `, the AI ${aiReading.read} more` : ''} — see the C++ preview
              </span>
            </p>
          ) : null}
          {block && unresolvedLines.length > 0 && (
            <p className="text-[11px] text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Line{unresolvedLines.length === 1 ? '' : 's'} {unresolvedLines.join(', ')} not understood yet — the AI is asked when you compile</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="sm"
              onClick={() => compile()}
              disabled={!block || status === 'busy'}
              className="h-7 text-xs gap-1.5"
            >
              <Cpu className="w-3 h-3" /> Compile
            </Button>
            <Button
              size="sm"
              onClick={upload}
              disabled={!block || status === 'busy' || (needsSerialPort && browserFlashable && !port)}
              className="h-7 text-xs gap-1.5"
            >
              <Upload className="w-3 h-3" /> {browserFlashable ? 'Upload' : 'Export for IDE'}
            </Button>
          </div>

          {progress && progress.phase === 'write' && progress.total && (
            <div className="h-1.5 rounded bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${((100 * (progress.written ?? 0)) / progress.total).toFixed(1)}%` }}
              />
            </div>
          )}

          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCppPreviewOpen((v) => !v)}
              disabled={!transpiled}
              className="h-7 flex-1 text-xs gap-1.5 justify-start text-muted-foreground"
            >
              <Code2 className="w-3 h-3" /> {cppPreviewOpen ? 'Hide C++' : 'View C++ (.ino)'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => transpiled && downloadText(`${board.id}.ino`, transpiled.ino)}
              disabled={!transpiled}
              className="h-7 px-2 text-xs gap-1 text-muted-foreground"
              title="Download generated Arduino .ino sketch"
            >
              <Download className="w-3 h-3" /> .ino
            </Button>
            {hexCache && (
              <Button
                size="sm"
                variant="ghost"
                onClick={exportFirmware}
                className="h-7 px-2 text-xs gap-1 text-emerald-400"
                title="Download compiled firmware binary"
              >
                <Download className="w-3 h-3" /> {board.uploader === 'uf2' ? '.uf2' : '.hex'}
              </Button>
            )}
          </div>

          {cppPreviewOpen && transpiled && (
            <div className="rounded border border-border/60 bg-background/80 p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">{board.id}.ino</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-[10px] gap-1"
                  onClick={() => {
                    navigator.clipboard.writeText(transpiled.ino);
                    toast.success('Copied C++ sketch to clipboard');
                  }}
                >
                  <Copy className="w-2.5 h-2.5" /> Copy
                </Button>
              </div>
              <pre className="max-h-48 overflow-auto text-[10px] font-mono leading-relaxed text-foreground/90 whitespace-pre">
                {transpiled.ino}
              </pre>
            </div>
          )}
        </section>

        {/* In-Browser Virtual Breadboard Simulator */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Virtual Breadboard &amp; Pinout Simulator
            </label>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1.5 text-[10px]"
              onClick={() => setSimulatorOpen((o) => !o)}
            >
              {simulatorOpen ? 'Hide' : 'Show'}
            </Button>
          </div>
          {simulatorOpen && (
            <HardwareSimulatorCanvas
              source={understoodSource}
              boardId={board.id}
              onSerialLine={onAppendLog}
            />
          )}
        </section>

        {/* Build server */}
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
            <Button size="sm" variant="outline" onClick={testBuildServer} className="h-7 px-2 text-xs">
              Test
            </Button>
          </div>
          <p className={`text-[10px] ${buildOk === true ? 'text-emerald-400' : buildOk === false ? 'text-red-400' : 'text-muted-foreground'}`}>
            {buildOk === true ? (
              'Local arduino-cli bridge reachable — all 30+ boards enabled.'
            ) : cloudReady ? (
              <>Zero-install cloud compilation is active for {board.label}. For offline or custom cores, run <code className="font-mono">node tools/arduino-build-server/server.mjs</code>.</>
            ) : (
              <>Run <code className="font-mono">node tools/arduino-build-server/server.mjs</code> locally (needs arduino-cli) to compile for {board.label}.</>
            )}
          </p>
        </section>

        {/* Serial Monitor */}
        <section className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Serial monitor</label>
          <div className="flex gap-1.5">
            <Select value={String(baud)} onValueChange={(v) => setBaud(parseInt(v, 10))}>
              <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 500000, 1000000].map((b) => (
                  <SelectItem key={b} value={String(b)} className="text-xs">
                    {b} baud
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={monitorOpen ? 'default' : 'outline'}
              onClick={toggleMonitor}
              disabled={!port}
              className="h-7 text-xs gap-1.5"
            >
              <Terminal className="w-3 h-3" /> {monitorOpen ? 'Stop' : 'Open'}
            </Button>
          </div>
          {monitorOpen && (
            <div className="flex gap-1.5 pt-1">
              <input
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendSerial();
                }}
                placeholder="Send line to Serial…"
                className="h-7 flex-1 rounded border border-border/60 bg-background px-2 text-[11px] font-mono outline-none focus:border-primary"
              />
              <Button size="sm" variant="secondary" onClick={handleSendSerial} className="h-7 px-2 text-xs gap-1">
                <Send className="w-3 h-3" /> Send
              </Button>
            </div>
          )}
        </section>

        {/* Library Manager */}
        <section className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Libraries</label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLibrariesOpen((o) => !o)}
            className="h-7 w-full text-xs gap-1.5 justify-start"
          >
            <Library className="w-3 h-3" /> Library Manager (10,232 libraries)
          </Button>
          {librariesOpen && <LibrariesPanel board={board} usedInSketch={transpiled?.libraries ?? []} onInsertCode={onInsertCode} />}
        </section>
      </div>
    </div>
  );
}

// --------------------------------------------------------------
// Library manager — fed by local /arduino/library-index.json (10,232 libs)
// + curated ARDUINO_LIBRARIES with runnable SDEV examples.
// --------------------------------------------------------------
interface IndexedLibrary {
  name: string;
  latest: string;
  headers?: string[];
  sentence?: string;
  category?: string;
  architectures?: string[];
  author?: string;
  curated?: ArduinoLibrary;
}

const CURATED_BY_NAME = new Map<string, ArduinoLibrary>(
  ARDUINO_LIBRARIES.map((l) => [l.name.toLowerCase(), l])
);

function LibrariesPanel({ board, usedInSketch, onInsertCode }: { board: BoardDescriptor; usedInSketch: string[]; onInsertCode?: (snippet: string) => void }) {
  const [libs, setLibs] = useState<IndexedLibrary[]>(() =>
    // Seed immediately with curated libraries so the panel is never empty
    ARDUINO_LIBRARIES.map((c) => ({
      name: c.name,
      latest: c.bundled ? 'core' : 'latest',
      headers: c.headers,
      sentence: c.summary,
      category: c.category,
      curated: c,
    }))
  );
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'curated' | 'installed'>('all');
  const [loading, setLoading] = useState(false);
  const [installed, setInstalled] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('sdev.hw.libs') ?? '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('sdev.hw.libs', JSON.stringify(installed));
  }, [installed]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/arduino/library-index.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(
        (j: {
          libraries: [string, string, string[], string, string, string[], string][];
        }) => {
          if (cancelled) return;
          const byName = new Map<string, IndexedLibrary>();
          for (const c of ARDUINO_LIBRARIES) {
            byName.set(c.name.toLowerCase(), {
              name: c.name,
              latest: c.bundled ? 'core' : 'latest',
              headers: c.headers,
              sentence: c.summary,
              category: c.category,
              curated: c,
            });
          }
          for (const row of j.libraries) {
            const [name, version, includes, sentence, category, architectures, author] = row;
            const key = name.toLowerCase();
            const curated = CURATED_BY_NAME.get(key);
            byName.set(key, {
              name,
              latest: version,
              headers: curated?.headers ?? includes,
              sentence: curated?.summary ?? sentence,
              category: curated?.category ?? category,
              architectures,
              author,
              curated,
            });
          }
          setLibs([...byName.values()].sort((a, b) => a.name.localeCompare(b.name)));
        }
      )
      .catch(() => {
        // Fallback to official Arduino index if local static asset isn't served
        fetch('https://downloads.arduino.cc/libraries/library_index.json')
          .then((r) => r.json())
          .then((j: { libraries: { name: string; version: string; sentence?: string; category?: string }[] }) => {
            if (cancelled) return;
            const byName = new Map<string, IndexedLibrary>();
            for (const l of j.libraries) {
              const existing = byName.get(l.name);
              if (!existing || cmpVer(l.version, existing.latest) > 0) {
                const curated = CURATED_BY_NAME.get(l.name.toLowerCase());
                byName.set(l.name, {
                  name: l.name,
                  latest: l.version,
                  sentence: curated?.summary ?? l.sentence,
                  category: curated?.category ?? l.category,
                  curated,
                });
              }
            }
            setLibs([...byName.values()].sort((a, b) => a.name.localeCompare(b.name)));
          })
          .catch((e) => toast.error(`Failed to load Arduino library index: ${(e as Error).message}`));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return libs
      .filter((l) => {
        if (filterMode === 'curated' && !l.curated) return false;
        if (filterMode === 'installed' && !installed.includes(l.name) && !usedInSketch.includes(l.name)) return false;
        if (!q) return true;
        return (
          l.name.toLowerCase().includes(q) ||
          (l.sentence ?? '').toLowerCase().includes(q) ||
          (l.category ?? '').toLowerCase().includes(q) ||
          (l.headers ?? []).some((h) => h.toLowerCase().includes(q))
        );
      })
      .slice(0, 80);
  }, [libs, query, filterMode, installed, usedInSketch]);

  return (
    <div className="rounded border border-border/50 bg-muted/20 p-2 space-y-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${libs.length.toLocaleString()} libraries…`}
        className="w-full h-7 px-2 rounded bg-background border border-border/50 text-xs outline-none focus:border-primary"
      />
      <div className="flex gap-1 text-[10px]">
        {(['all', 'curated', 'installed'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setFilterMode(m)}
            className={`px-2 py-0.5 rounded capitalize ${
              filterMode === m ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {m === 'curated' ? `Curated (${ARDUINO_LIBRARIES.length})` : m === 'installed' ? `Active (${installed.length + usedInSketch.length})` : `All (${libs.length.toLocaleString()})`}
          </button>
        ))}
      </div>
      {loading && <p className="text-[11px] text-muted-foreground">loading full index…</p>}
      <div className="max-h-64 overflow-auto space-y-1">
        {filtered.map((l) => {
          const isInstalled = installed.includes(l.name);
          const isUsed = usedInSketch.includes(l.name);
          const isBundled = l.curated?.bundled;
          return (
            <div key={l.name} className="p-1.5 rounded hover:bg-muted/50 space-y-1 border border-transparent hover:border-border/40">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono truncate flex items-center gap-1.5">
                    {l.name}
                    <span className="text-[9px] text-muted-foreground">{l.latest}</span>
                    {isBundled && <span className="text-[9px] px-1 rounded bg-emerald-500/15 text-emerald-400">built-in</span>}
                    {isUsed && <span className="text-[9px] text-primary">·used</span>}
                  </div>
                  {l.sentence && <div className="text-[10px] text-muted-foreground line-clamp-2">{l.sentence}</div>}
                  {l.headers && l.headers.length > 0 && (
                    <div className="text-[9px] font-mono text-muted-foreground/80">
                      use "{l.name}" → {l.headers.map((h) => `<${h}>`).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant={isInstalled ? 'secondary' : 'outline'}
                    className="h-6 px-2 text-[10px]"
                    onClick={() =>
                      setInstalled((s) => (isInstalled ? s.filter((n) => n !== l.name) : [...s, l.name]))
                    }
                  >
                    {isInstalled ? 'Remove' : 'Install'}
                  </Button>
                  {l.curated?.example && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 px-1.5 text-[9px] gap-1 text-primary"
                      onClick={() => {
                        const snippet = `board "${board.id}" ::\n${l.curated!.example!.split('\n').map((ln) => '  ' + ln).join('\n')}\n;;`;
                        if (onInsertCode) {
                          onInsertCode(snippet);
                          toast.success(`Inserted ${l.name} sdev example into editor`);
                        } else {
                          navigator.clipboard.writeText(snippet);
                          toast.success(`Copied ${l.name} sdev example to clipboard`);
                        }
                      }}
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Example
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <p className="text-[11px] text-muted-foreground p-2">no matching libraries</p>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Reference any library in your sketch with <code>use "&lt;Name&gt;"</code>. Installed libraries are included when compiling for {board.fqbn}.
      </p>
    </div>
  );
}

function cmpVer(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

function hex4(n: number): string {
  return n.toString(16).padStart(4, '0');
}

function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  triggerDownload(blob, name);
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
