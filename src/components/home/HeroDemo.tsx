import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';

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
  const demo = DEMOS[index];

  useEffect(() => {
    if (reduce) return;
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
  }, [phase, typed, shown, demo, reduce]);

  const lines = demo.code.slice(0, typed).split('\n');

  return (
    <div className="hero-demo">
      <div className="flex items-center gap-3 border-b border-border px-4 h-11">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex gap-1 text-xs font-mono">
          {DEMOS.map((d, i) => (
            <span key={d.file} className={`px-2.5 py-1 rounded-md transition-colors ${i === index ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}>{d.file}</span>
          ))}
        </div>
        <button
          onClick={() => onOpen(demo.code + '\n', demo.file.replace('.sdev', ''))}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Open in IDE
        </button>
      </div>
      <pre className="px-5 py-5 font-mono text-[13px] leading-7 min-h-[11rem] text-foreground/90" aria-label={`Example program ${demo.file}`}>
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
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${phase === 'running' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <Play className="w-3 h-3" /> {phase === 'running' ? 'Running…' : 'Run'}
          </span>
        </div>
        <div className="font-mono text-[13px] leading-6 min-h-[4.5rem]" aria-live="polite">
          {demo.output.slice(0, shown).map((o, i) => (
            <div key={`${index}-${i}`} className="hero-out"><span className="text-muted-foreground/60 mr-2">›</span>{o}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
