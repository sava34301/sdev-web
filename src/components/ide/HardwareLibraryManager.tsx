import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { type BoardDescriptor } from '@/lang/hardware/board-db';
import { ARDUINO_LIBRARIES, type ArduinoLibrary } from '@/lang/hardware/arduino-api';

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

function cmpVer(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export function HardwareLibraryManager({
  board,
  usedInSketch,
  onInsertCode,
}: {
  board: BoardDescriptor;
  usedInSketch: string[];
  onInsertCode?: (snippet: string) => void;
}) {
  const [libs, setLibs] = useState<IndexedLibrary[]>(() =>
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
