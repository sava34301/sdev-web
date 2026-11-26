import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ExternalLink } from 'lucide-react';
import { KEYWORD_TABLES } from '@/lang/tools/translator';
import { WORLD_LAND_PATH } from './worldLand';
import { SdevCode } from './SdevCode';
import { openInIde, runSdev, type RunResult } from './engine';

const COORDS: Record<string, [number, number]> = {
  English: [-0.13, 51.5], Spanish: [-3.7, 40.4], French: [2.35, 48.85], German: [13.4, 52.5], Portuguese: [-9.14, 38.7],
  Italian: [12.5, 41.9], Dutch: [4.9, 52.37], Russian: [37.6, 55.75], Chinese: [116.4, 39.9], Japanese: [139.7, 35.7],
  Korean: [127, 37.5], Arabic: [31.2, 30.0], Hindi: [77.2, 28.6], Turkish: [32.85, 39.9], Polish: [21, 52.2],
  Swedish: [18.07, 59.33], Norwegian: [10.75, 59.9], Danish: [12.57, 55.68], Finnish: [24.94, 60.17], Greek: [23.73, 37.98],
  Hebrew: [35.2, 31.77], Ukrainian: [30.52, 50.45], Czech: [14.42, 50.08], Romanian: [26.1, 44.43], Hungarian: [19.04, 47.5],
  Bulgarian: [23.32, 42.7],
};
const LANGS = ['English', ...Object.keys(KEYWORD_TABLES)].filter((l) => COORDS[l]);
const SHOWN = ['forge', 'be', 'speak', 'conjure', 'yield', 'ponder', 'otherwise', 'cycle', 'iterate', 'through', 'essence', 'attempt'];
const SAMPLE = `forge name be "Ada"\nspeak("Hello, " + name)\n\nforge n be 1\ncycle n <= 3 ::\n  speak(n)\n  n be n + 1\n;;`;

const VIEWS = { world: [0, 20, 1000, 395], europe: [425, 45, 317, 125] } as const;
type View = keyof typeof VIEWS;
const project = ([lon, lat]: [number, number]) => [((lon + 180) / 360) * 1000, ((90 - lat) / 180) * 500];

const reverseTable = (lang: string) => {
  const rev: Record<string, string> = {};
  if (lang === 'English') return rev;
  for (const [native, en] of Object.entries(KEYWORD_TABLES[lang] ?? {})) rev[en] ??= native;
  return rev;
};
const translate = (code: string, rev: Record<string, string>) =>
  code.split(/("(?:[^"\\]|\\.)*")/).map((seg, i) => (i % 2 ? seg : seg.replace(/[\p{L}_][\p{L}\p{N}_]*/gu, (w) => rev[w] ?? w))).join('');

function useViewBox(view: View) {
  const [vb, setVb] = useState<number[]>([...VIEWS.world]);
  const from = useRef(vb);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = VIEWS[view];
    let id = 0;
    const tick = (t: number) => {
      const k = Math.min((t - start) / 700, 1);
      const e = 1 - Math.pow(1 - k, 4);
      const next = a.map((v, i) => v + (b[i] - v) * e);
      from.current = next;
      setVb(next);
      if (k < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [view]);
  return vb;
}

export function DialectMap() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('Bulgarian');
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState<View>('europe');
  const [res, setRes] = useState<RunResult | null>(null);
  const vb = useViewBox(view);
  const rev = useMemo(() => reverseTable(lang), [lang]);
  const code = useMemo(() => translate(SAMPLE, rev), [rev]);
  const natives = useMemo(() => new Set(Object.values(rev)), [rev]);
  const r = vb[2] / 140;

  const choose = (l: string) => { setLang(l); setRes(null); };

  return (
    <div data-testid="dialect-map" className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-12">
      <div className="relative bg-card lg:col-span-7 flex flex-col">
        <div className="absolute left-4 top-4 z-10 flex rounded-full border border-border bg-background/90 p-1 backdrop-blur">
          {(Object.keys(VIEWS) as View[]).map((v) => (
            <button key={v} data-testid={`dialect-map-view-${v}`} onClick={() => setView(v)}
              className={`rounded-full px-3 py-1 font-mono text-[11px] capitalize transition-colors ${view === v ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>{v}</button>
          ))}
        </div>
        <p className="absolute right-4 top-5 z-10 font-mono text-[11px] text-muted-foreground">{LANGS.length} keyword languages</p>
        <svg viewBox={vb.join(' ')} className="block w-full aspect-[1000/395] dots" preserveAspectRatio="xMidYMid meet" role="img" aria-label="World map of sdev keyword languages">
          <path d={WORLD_LAND_PATH} fill="hsl(var(--foreground) / 0.08)" stroke="hsl(var(--foreground) / 0.25)" strokeWidth={vb[2] / 1400} />
          {LANGS.map((l) => {
            const [x, y] = project(COORDS[l]);
            const active = l === lang;
            return (
              <g key={l} data-testid={`dialect-pin-${l.toLowerCase()}`} className="cursor-pointer" onClick={() => choose(l)} onMouseEnter={() => setHover(l)} onMouseLeave={() => setHover(null)}>
                <circle cx={x} cy={y} r={r * 2.6} fill="transparent" />
                {active && <circle cx={x} cy={y} r={r * 2.2} fill="hsl(var(--lime) / 0.35)"><animate attributeName="r" values={`${r * 1.2};${r * 3};${r * 1.2}`} dur="2.4s" repeatCount="indefinite" /></circle>}
                <circle cx={x} cy={y} r={active ? r * 1.15 : r * 0.8} fill={active ? 'hsl(var(--ink))' : 'hsl(var(--primary))'} stroke="hsl(var(--card))" strokeWidth={r * 0.35} />
                {(active || hover === l) && (
                  <text x={x + r * 1.8} y={y + r * 0.6} fontSize={r * 2.4} className="font-mono" fill="hsl(var(--foreground))" style={{ paintOrder: 'stroke', stroke: 'hsl(var(--card))', strokeWidth: r * 0.8 }}>
                    {l} · {l === 'English' ? 'forge' : reverseTable(l).forge}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="flex gap-1.5 overflow-x-auto border-t border-border p-3 lg:flex-wrap lg:overflow-visible lg:p-5" data-lenis-prevent>
          {LANGS.map((l) => (
            <button key={l} onClick={() => choose(l)} data-testid={`dialect-chip-${l.toLowerCase()}`}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${l === lang ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="bg-card p-6 sm:p-8 lg:col-span-5">
        <p className="label">Selected</p>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <h3 data-testid="dialect-selected-name" className="font-display text-4xl font-bold">{lang}</h3>
          <span className="font-mono text-2xl text-primary">{rev.forge ?? 'forge'}</span>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 border-t border-border text-sm">
          {SHOWN.map((k) => (
            <div key={k} className="flex justify-between gap-3 border-b border-border py-2">
              <dt className="font-mono text-xs text-muted-foreground">{k}</dt>
              <dd className="truncate font-mono text-xs font-medium">{rev[k] ?? k}</dd>
            </div>
          ))}
        </dl>
        <div className="ink mt-6 overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="font-mono text-[11px] text-muted-foreground">hello-{lang.toLowerCase()}.sdev</span>
            <div className="flex gap-1">
              <button data-testid="dialect-open-ide" onClick={() => openInIde(code, `hello-${lang.toLowerCase()}`, navigate)} aria-label="Open in IDE" className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></button>
              <button data-testid="dialect-run" onClick={() => setRes(runSdev(code))} className="inline-flex h-7 items-center gap-1 rounded bg-[hsl(var(--lime))] px-2.5 text-[11px] font-semibold text-[hsl(var(--ink))]"><Play className="h-3 w-3" /> Run</button>
            </div>
          </div>
          <SdevCode code={code} extraKeywords={natives} className="p-3" />
          {res && (
            <div data-testid="dialect-output" className="border-t border-border px-3 py-2 font-mono text-xs">
              {res.lines.map((l, i) => <p key={i}>› {l}</p>)}
              {res.error && <p className="text-[#ff8a7a]">{res.error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
