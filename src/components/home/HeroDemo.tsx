import { useEffect, useState } from 'react';
import { Play, Pause, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Demo = { file: string; code: string; output: string[] };

/** Short, real-looking programs that show sdev reading like plain language. */
const DEMOS: Demo[] = [
  {
    file: 'hello.sdev',
    code: `forge name be "Ada"\nspeak("Hello, " + name + "!")`,
    output: ['Hello, Ada!'],
  },
  {
    file: 'everyday.sdev',
    code: `calculate 23 - 21\nprint the first 6 fibonacci numbers`,
    output: ['2', '0  1  1  2  3  5'],
  },
  {
    file: 'loop.sdev',
    code: `forge names be ["Ada", "Grace", "Linus"]\niterate name through names ::\n  speak("Welcome, " + name)\n;;`,
    output: ['Welcome, Ada', 'Welcome, Grace', 'Welcome, Linus'],
  },
];

const KEYWORDS = new Set(['forge', 'be', 'speak', 'iterate', 'through', 'calculate', 'print']);

function highlight(line: string) {
  return line.split(/("[^"]*"?|\b\w+\b|::|;;)/g).map((part, i) => {
    if (!part) return null;
    if (part.startsWith('"')) return <span key={i} className="text-brand-green">{part}</span>;
    if (KEYWORDS.has(part)) return <span key={i} className="text-primary">{part}</span>;
    if (/^\d+$/.test(part)) return <span key={i} className="text-brand-amber">{part}</span>;
    if (part === '::' || part === ';;') return <span key={i} className="text-muted-foreground">{part}</span>;
    return <span key={i}>{part}</span>;
  });
}

/**
 * Hero code window: types a program, "runs" it, shows the output, then moves on.
 * Reduced motion shows the finished first example without animating.
 */
export function HeroDemo({ onOpen }: { onOpen: (code: string, name: string) => void }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(reduce ? DEMOS[0].code.length : 0);
  const [phase, setPhase] = useState<'typing' | 'running' | 'done'>(reduce ? 'done' : 'typing');
  const [shown, setShown] = useState(reduce ? DEMOS[0].output.length : 0);
  const [paused, setPaused] = useState(false);
  const demo = DEMOS[index];
  const selectDemo = (i: number) => {
    setIndex(i);
    setTyped(DEMOS[i].code.length);
    setShown(DEMOS[i].output.length);
    setPhase('done');
    setPaused(true);
  };

  useEffect(() => {
    if (reduce || paused) return;
    let timer: number;
    if (phase === 'typing') {
      if (typed < demo.code.length) {
        const ch = demo.code[typed];
        timer = window.setTimeout(() => setTyped((t) => t + 1), ch === '\n' ? 260 : 28 + Math.random() * 40);
      } else {
        timer = window.setTimeout(() => setPhase('running'), 450);
      }
    } else if (phase === 'running') {
      timer = window.setTimeout(() => { setPhase('done'); setShown(1); }, 650);
    } else if (shown < demo.output.length) {
      timer = window.setTimeout(() => setShown((s) => s + 1), 220);
    } else {
      timer = window.setTimeout(() => {
        setIndex((i) => (i + 1) % DEMOS.length);
        setTyped(0); setShown(0); setPhase('typing');
      }, 3200);
    }
    return () => window.clearTimeout(timer);
  }, [phase, typed, shown, demo, reduce, paused]);

  const lines = demo.code.slice(0, typed).split('\n');

  return (
    <div className="hero-demo">
      <div className="flex items-center gap-2 border-b border-border px-3 h-12">
        <div className="hidden sm:flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="demo-tabs flex gap-1 text-xs font-mono" role="tablist" aria-label="Code examples">
          {DEMOS.map((d, i) => (
            <Button key={d.file} variant="ghost" size="sm" role="tab" id={`demo-tab-${i}`} aria-selected={i === index} aria-controls="demo-panel" tabIndex={i === index ? 0 : -1} onClick={() => selectDemo(i)} onKeyDown={(e) => {
              const next = e.key === 'ArrowRight' ? (i + 1) % DEMOS.length : e.key === 'ArrowLeft' ? (i + DEMOS.length - 1) % DEMOS.length : e.key === 'Home' ? 0 : e.key === 'End' ? DEMOS.length - 1 : undefined;
              if (next === undefined) return;
              e.preventDefault(); selectDemo(next); document.getElementById(`demo-tab-${next}`)?.focus();
            }} className="demo-tab h-8 px-2 text-xs font-mono text-muted-foreground">{d.file}</Button>
          ))}
        </div>
        <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 shrink-0" aria-label="Open example in IDE" title="Open example in IDE"
          onClick={() => onOpen(demo.code + '\n', demo.file.replace('.sdev', ''))}
        >
          <ExternalLink />
        </Button>
      </div>
      <pre id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${index}`} className="demo-code px-5 py-5 font-mono text-[13px] leading-7 text-foreground/90" aria-label={`Example program ${demo.file}`}>
        {lines.map((l, i) => (
          <div key={i} className="flex">
            <span className="w-7 shrink-0 select-none text-muted-foreground/40">{i + 1}</span>
            <span>{highlight(l)}{i === lines.length - 1 && phase === 'typing' && <span className="hero-caret" />}</span>
          </div>
        ))}
      </pre>
      <div className="border-t border-border bg-background/50 px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Output</span>
          <div className="flex items-center gap-1">
            {!reduce && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPaused(p => !p)} aria-label={paused ? 'Resume examples' : 'Pause examples'} title={paused ? 'Resume examples' : 'Pause examples'}>{paused ? <Play /> : <Pause />}</Button>}
            <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => { setPaused(true); setTyped(demo.code.length); setShown(demo.output.length); setPhase('done'); }}><Play /> Preview</Button>
          </div>
        </div>
        <div className="demo-output font-mono text-[13px] leading-6" aria-live={paused ? 'polite' : 'off'}>
          {demo.output.slice(0, shown).map((o, i) => (
            <div key={`${index}-${i}`} className="hero-out"><span className="text-muted-foreground/60 mr-2">›</span>{o}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
