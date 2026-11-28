import { useState, type ReactNode } from 'react';
import { Check, Download, Play } from 'lucide-react';
import { toast } from 'sonner';
import { SdevCode } from '@/components/home/SdevCode';
import { runSdev, type RunResult } from '@/components/home/engine';
import { installExtension, type ExtensionRecord } from '@/lang/dialect/extensions';

export function GalleryHero({ label, title, accent, intro, children }: { label: string; title: string; accent: string; intro: string; children?: ReactNode }) {
  return (
    <section className="wrap pt-14 sm:pt-20" data-testid="gallery-hero">
      <div className="border-b border-foreground/15 pb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="grid gap-8 pt-10 lg:grid-cols-12 lg:items-end">
        <h1 className="lg:col-span-7 font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">{title} <span className="serif-i font-normal text-primary">{accent}</span></h1>
        <div className="lg:col-span-5 space-y-5">
          <p className="text-muted-foreground">{intro}</p>
          {children}
        </div>
      </div>
    </section>
  );
}

export function RunPanel({ code, label = 'Try it' }: { code: string; label?: string }) {
  const [res, setRes] = useState<RunResult | null>(null);
  return (
    <div>
      <button data-testid="gallery-try" onClick={() => setRes(runSdev(code))} className="btn-ink !h-9 !px-4"><Play className="h-3.5 w-3.5" /> {label}</button>
      {res && (
        <div data-testid="gallery-try-output" className="mt-3 rounded-lg border border-border bg-background p-3 font-mono text-xs leading-5">
          {res.lines.map((l, i) => <p key={i}>› {l}</p>)}
          {res.error && <p className="text-destructive">{res.error}</p>}
          {!res.error && res.lines.length === 0 && <p className="text-muted-foreground">Ran with no output.</p>}
        </div>
      )}
    </div>
  );
}

const ATOM = String.raw`(?:[\p{L}\p{N}_]+(?:\([^()]*\))?|"[^"]*")`;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const desugar = (ext: ExtensionRecord, code: string) =>
  ext.kind === 'operator' && ext.symbol ? code.replace(new RegExp(`(${ATOM})\\s*${esc(ext.symbol)}\\s*(${ATOM})`, 'gu'), (_m, a, b) => `${ext.name}(${a}, ${b})`) : code;

export function ExtensionCard({ ext, usage, author }: { ext: ExtensionRecord; usage: string; author: string }) {
  const [done, setDone] = useState(false);
  return (
    <article data-testid={`extension-card-${ext.id}`} className="rv flex flex-col rounded-2xl border border-border bg-card p-5 transition-[border-color] hover:border-foreground/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl font-bold">{ext.name}{ext.symbol && <code className="ml-2 rounded bg-[hsl(var(--lime))] px-1.5 py-0.5 font-mono text-sm text-[hsl(var(--ink))]">{ext.symbol}</code>}</h3>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{author}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{ext.kind}</span>
      </div>
      {ext.about && <p className="mt-3 text-sm text-muted-foreground">{ext.about}</p>}
      <div className="ink mt-4 overflow-hidden rounded-xl border border-border">
        <SdevCode code={ext.source.trim()} className="p-4 text-[12px]" />
        <div className="border-t border-border px-4 py-2"><span className="label !text-[9px]">usage</span><SdevCode code={usage} className="text-[12px]" /></div>
      </div>
      <div className="mt-4 flex flex-wrap items-start gap-2">
        <RunPanel code={`${ext.source.trim()}\n\n${desugar(ext, usage)}`} />
        <button data-testid={`extension-install-${ext.id}`} onClick={() => { installExtension(ext); setDone(true); toast.success(`${ext.name} installed — it now works in the IDE`); }} className="btn-line !h-9 !px-4">
          {done ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />} {done ? 'Installed' : 'Install'}
        </button>
      </div>
    </article>
  );
}

export const STARTER_EXTENSIONS: { ext: ExtensionRecord; usage: string }[] = [
  { ext: { id: 'starter-twice', name: 'twice', kind: 'function', symbol: null, about: 'Double any number — written in everyday sdev.', source: 'to twice with n\n  return n * 2\nend' }, usage: 'speak(twice(21))' },
  { ext: { id: 'starter-clamp', name: 'clamp', kind: 'function', symbol: null, about: 'Keep a value between a lower and an upper bound.', source: 'conjure clamp(x, lo, hi) ::\n  ponder x < lo :: yield lo ;;\n  ponder x > hi :: yield hi ;;\n  yield x\n;;' }, usage: 'speak(clamp(15, 0, 10))' },
  { ext: { id: 'starter-avg', name: 'avg', kind: 'operator', symbol: '^^', about: 'A new operator: a ^^ b gives the average of two numbers.', source: 'conjure avg(a, b) ::\n  yield (a + b) / 2\n;;' }, usage: 'speak(4 ^^ 10)' },
  { ext: { id: 'starter-joinw', name: 'joinw', kind: 'operator', symbol: '<+>', about: 'Join two words with a space: "hello" <+> "world".', source: 'conjure joinw(a, b) ::\n  yield a + " " + b\n;;' }, usage: 'speak("hello" <+> "world")' },
];
