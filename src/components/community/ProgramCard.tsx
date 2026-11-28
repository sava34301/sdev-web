import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ExternalLink, Loader2, Palette, TerminalSquare, Globe, Star } from 'lucide-react';
import { CanvasPanel } from '@/components/CanvasPanel';
import { WebPreviewPanel } from '@/components/ide/WebPreviewPanel';
import { SdevCode } from '@/components/home/SdevCode';
import { openInIde, runSdev, type RunResult } from '@/components/home/engine';

export interface ShowcaseProgram {
  id: string;
  title: string;
  author: string;
  code: string;
  href?: string;
  views?: number;
  featured?: boolean;
}

const isGraphics = (code: string) => /\b(canvas|turtle|forward|circle|rect|clear)\s*\(/.test(code);
const isWeb = (code: string) => /\b(page|endpage|tag|stylesheet|onclick)\s*\(/.test(code);

function MiniBrowser({ web }: { web: NonNullable<RunResult['web']> }) {
  return (
    <div data-testid="showcase-mini-browser" className="overflow-hidden border-b border-border">
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-3 py-2">
        <span className="flex gap-1"><i className="h-2 w-2 rounded-full bg-foreground/20" /><i className="h-2 w-2 rounded-full bg-foreground/20" /><i className="h-2 w-2 rounded-full bg-foreground/20" /></span>
        <span className="flex-1 truncate rounded-md bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">sdev://{(web.title || 'page').toLowerCase().replace(/\s+/g, '-')}</span>
      </div>
      <div className="h-[26rem] [&>*]:h-full"><WebPreviewPanel state={web} /></div>
    </div>
  );
}

export function ProgramCard({ p, index }: { p: ShowcaseProgram; index: number }) {
  const navigate = useNavigate();
  const [res, setRes] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = p.code.split('\n').filter((l, i, a) => l.trim() || (i > 0 && a[i - 1].trim())).slice(0, 12).join('\n');
  const gfx = isGraphics(p.code);
  const web = isWeb(p.code);
  const kind = web ? 'web page' : gfx ? 'graphics' : 'console';

  const run = () => {
    setBusy(true);
    requestAnimationFrame(() => { setRes(runSdev(p.code)); setBusy(false); });
  };

  return (
    <article data-testid={`showcase-card-${p.id}`} className={`rv group flex break-inside-avoid flex-col overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow] duration-300 hover:border-foreground/30 hover:shadow-[0_30px_60px_-30px_rgba(20,23,28,0.35)] mb-5 ${p.featured ? 'border-foreground/40 ring-1 ring-[hsl(var(--lime))]' : 'border-border'}`} style={{ ['--d' as string]: `${(index % 3) * 80}ms` }}>
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl font-bold">{p.title}</h3>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{p.author}{p.views != null && ` · ${p.views} views`}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {p.featured && <span data-testid={`showcase-featured-${p.id}`} className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--lime))] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ink))]"><Star className="h-3 w-3 fill-current" />Featured</span>}
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {web ? <Globe className="h-3 w-3" /> : gfx ? <Palette className="h-3 w-3" /> : <TerminalSquare className="h-3 w-3" />}{kind}
          </span>
        </div>
      </div>
      <div className="ink relative mx-3 overflow-hidden rounded-xl border border-border">
        <SdevCode code={preview} className="max-h-64 overflow-hidden p-4 text-[12px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[hsl(var(--background))] to-transparent" />
      </div>
      {res && (
        <div data-testid={`showcase-result-${p.id}`} className="mx-3 mt-3 overflow-hidden rounded-xl border border-border bg-background">
          {res.web?.produced && <MiniBrowser web={res.web} />}
          {res.commands.length > 0 && <div className="flex justify-center bg-[#0d0f10] p-2 [&_canvas]:max-w-full [&_canvas]:h-auto"><CanvasPanel commands={res.commands} /></div>}
          {(res.lines.length > 0 || res.error) && (
            <div className="max-h-44 overflow-y-auto p-3 font-mono text-xs leading-5" data-lenis-prevent>
              {res.lines.slice(0, 60).map((l, i) => <p key={i}>› {l}</p>)}
              {res.error && <p className="text-destructive">{res.error}</p>}
            </div>
          )}
          <p className="border-t border-border px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{res.ms.toFixed(1)} ms · real interpreter</p>
        </div>
      )}
      <div className="mt-auto flex items-center gap-2 p-4">
        <button data-testid={`showcase-run-${p.id}`} onClick={run} className="btn-ink !h-9 !px-4">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} {res ? 'Run again' : 'Run'}
        </button>
        <button data-testid={`showcase-ide-${p.id}`} onClick={() => openInIde(p.code, p.title.replace(/\.sdev$/, ''), navigate)} className="btn-line !h-9 !px-4"><ExternalLink className="h-3.5 w-3.5" /> Open in IDE</button>
        {p.href && <a href={p.href} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Share page</a>}
      </div>
    </article>
  );
}
