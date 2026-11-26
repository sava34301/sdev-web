import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ExternalLink, RotateCcw } from 'lucide-react';
import { SdevCode } from './SdevCode';
import { HOME_EXAMPLES, openInIde, runSdev, type RunResult } from './engine';

function Editor({ value, onChange, onRun }: { value: string; onChange: (v: string) => void; onRun: () => void }) {
  const layer = useRef<HTMLDivElement>(null);
  return (
    <div className="relative h-full min-h-[340px] overflow-hidden">
      <div ref={layer} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden p-4"><SdevCode code={value} numbered /></div>
      <textarea
        data-testid="playground-editor" value={value} spellCheck={false} wrap="off" aria-label="sdev code"
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => { if (layer.current) { layer.current.scrollTop = e.currentTarget.scrollTop; layer.current.scrollLeft = e.currentTarget.scrollLeft; } }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onRun(); }
          if (e.key === 'Tab') { e.preventDefault(); const t = e.currentTarget; const s = t.selectionStart; onChange(value.slice(0, s) + '  ' + value.slice(t.selectionEnd)); requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2; }); }
        }}
        className="absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent p-4 pl-[2.75rem] font-mono text-[13px] leading-6 text-transparent caret-[hsl(var(--lime))] outline-none selection:bg-[hsl(var(--lime)/0.25)]"
        style={{ WebkitTextFillColor: 'transparent' }}
      />
    </div>
  );
}

export function LivePlayground() {
  const navigate = useNavigate();
  const [ex, setEx] = useState(HOME_EXAMPLES[0]);
  const [code, setCode] = useState(ex.code);
  const [res, setRes] = useState<RunResult | null>(null);

  const pick = (id: string) => {
    const next = HOME_EXAMPLES.find((e) => e.id === id) ?? HOME_EXAMPLES[0];
    setEx(next); setCode(next.code); setRes(null);
  };
  const run = () => setRes(runSdev(code));

  return (
    <div data-testid="home-playground" className="ink overflow-hidden rounded-2xl border border-border">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-2">
        {HOME_EXAMPLES.map((e) => (
          <button key={e.id} data-testid={`playground-example-${e.id}`} onClick={() => pick(e.id)}
            className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${ex.id === e.id ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {e.name}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <button data-testid="playground-reset" onClick={() => pick(ex.id)} aria-label="Reset" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"><RotateCcw className="h-3.5 w-3.5" /></button>
          <button data-testid="playground-open-ide" onClick={() => openInIde(code, ex.name.replace('.sdev', ''), navigate)} className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs text-muted-foreground hover:bg-foreground/10 hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /> Open in IDE</button>
          <button data-testid="playground-run" onClick={run} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[hsl(var(--lime))] px-3.5 text-xs font-semibold text-[hsl(var(--ink))] transition-transform active:scale-95">
            <Play className="h-3.5 w-3.5" /> Run <kbd className="hidden sm:inline font-mono text-[10px] opacity-60">⌘↵</kbd>
          </button>
        </div>
      </div>
      <div className="grid lg:grid-cols-5">
        <div className="lg:col-span-3 min-h-[340px] border-b lg:border-b-0 lg:border-r border-border">
          <Editor value={code} onChange={setCode} onRun={run} />
        </div>
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="label !text-[10px]">Output</span>
            {res && <span data-testid="playground-time" className="font-mono text-[10px] text-muted-foreground">{res.ms.toFixed(2)} ms · real interpreter</span>}
          </div>
          <div data-testid="playground-output" className="flex-1 p-4 font-mono text-[13px] leading-6 min-h-[200px]">
            {!res && <p className="text-muted-foreground">Press Run — this executes the actual sdev lexer, parser and interpreter in your browser.</p>}
            {res?.lines.map((l, i) => <p key={i} className="text-foreground">› {l}</p>)}
            {res?.error && <p data-testid="playground-error" className="mt-1 text-[#ff8a7a]">{res.error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
