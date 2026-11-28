import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Copy, Download, BookOpen, Puzzle, Library, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import { SdevChatbot } from '@/components/SdevChatbot';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { HeroFrame } from '@/components/home/HeroFrame';
import { LivePlayground } from '@/components/home/LivePlayground';
import { DialectMap } from '@/components/home/DialectMap';
import { SdevCode } from '@/components/home/SdevCode';
import { openInIde } from '@/components/home/engine';
import { KEYWORD_TABLES } from '@/lang/tools/translator';
import { useReveal } from '@/hooks/useReveal';
import releaseInfo from '../../release.json';

const INSTALL = 'npm i -g sdev-lang';

const SPECS = [
  ['Runtimes', '2', 'WebAssembly + native x86-64'],
  ['Keyword languages', '26', 'write sdev in your own language'],
  ['Self-compile checks', '87', 'byte-identical every time'],
  ['Dependencies', '0', 'in native builds — no libc'],
];

const FORGES = Object.entries(KEYWORD_TABLES).map(([lang, t]) => [lang, Object.keys(t).find((k) => t[k] === 'forge') ?? 'forge']);

const MODES = [
  {
    id: 'v2',
    label: 'Prism v2',
    tag: 'Self-hosted compiler',
    summary: 'Clean, indentation-friendly block words compiled by the self-hosted sdev compiler to WebAssembly and native x86-64.',
    code: `#!sdev v2\nto factorial with n\n  if n <= 1\n    return 1\n  end\n  return n * factorial(n - 1)\nend\n\nsay "10! = " + str(factorial(10))`,
    note: 'Compiles directly through lexer.sdev → parser.sdev → codegen.sdev → WASM or x86-64 ELF/PE.',
  },
  {
    id: 'v1',
    label: 'Classic v1',
    tag: 'Expressive & batteries-included',
    summary: 'Readable English keywords with pipes, lambdas, classes, 2D canvas, GIS maps, and HTML generation built in.',
    code: `conjure greet(who) ::\n  yield "Hello, " + who + "!"\n;;\n\nforge guests be ["Ada", "Linus", "Grace"]\n  |> each(name -> greet(name))\n  |> weave(" · ")\n\nspeak(guests)`,
    note: 'Runs as written in the browser interpreter, bytecode VM, CLI, and Python parity runtime.',
  },
  {
    id: 'dialect',
    label: 'Personal Dialect',
    tag: 'Deterministic · zero AI',
    summary: 'Define your own keywords, block style, and operators in a pure .dialect.sdev file. Translates deterministically straight to v2.',
    code: `#!dialect @team/minimal\nfn clamp(x, lo, hi) {\n  when x < lo { ret lo }\n  when x > hi { ret hi }\n  ret x\n}\n\nprint(clamp(142, 0, 100))`,
    note: 'Bypasses AI completely — your syntax rules compile deterministically in both the IDE and CLI.',
  },
  {
    id: 'understander',
    label: 'Syntax-free (!#ai)',
    tag: 'Write in your own style',
    summary: 'Write naturally in any style or phrasing; the sdev-written code understander turns your intent into canonical sdev.',
    code: `!#ai\nlet prices = [19, 24, 35, 12]\nshow the sum of prices\nfor each p in prices:\n  if p > 20 then print p`,
    note: 'Runs the deterministic sdev engine first, with optional local WebGPU brain — zero cloud credits needed.',
  },
] as const;

const TARGETS = [
  { t: 'Browser', how: 'WebAssembly seed VM, instant start', file: 'sdev-seed.wasm', href: '/downloads/sdev-seed.wasm' },
  { t: 'Native x86-64', how: 'Zero-host ELF & Windows PE binaries, no libc', file: 'runtime.s', href: '/downloads/runtime.s' },
  { t: 'Command line', how: 'Run, test, build and publish from a terminal', file: 'sdev.mjs', href: '/downloads/sdev.mjs' },
  { t: 'VS Code', how: 'Syntax, diagnostics, run and native build', file: 'sdev-language.vsix', href: '/downloads/sdev-language.vsix' },
  { t: 'Web IDE', how: 'Files, time-travel debugger, canvas & local AI', file: 'sdev.codes/ide', href: '/ide' },
  { t: 'Hardware boards', how: 'Arduino & ESP32 firmware alongside sdev', file: 'board "<id>"', href: '/docs/hardware' },
];

const STAGES = [
  ['stage 0', 'sdev-seed.wasm', 'the seed VM, ~1,700 lines of auditable WebAssembly Text'],
  ['stage 1', 'sdev build compiler.sdev', 'the compiler compiles its own lexer, parser & codegen'],
  ['stage 2', './stage1 compiler.sdev', 'the resulting binary compiles the compiler source again'],
  ['verify', 'cmp stage1 stage2', 'identical — every byte, gated on every release'],
];

const Section = ({ n, title, kicker, children, id }: { n: string; title: React.ReactNode; kicker: string; children: React.ReactNode; id?: string }) => (
  <section id={id} className="wrap py-24 sm:py-32">
    <div className="rv grid gap-6 border-t border-foreground/20 pt-6 md:grid-cols-12">
      <p className="label md:col-span-3">§{n} — {kicker}</p>
      <h2 className="md:col-span-9 font-display text-4xl font-bold leading-[1.02] sm:text-5xl lg:text-6xl">{title}</h2>
    </div>
    <div className="mt-14">{children}</div>
  </section>
);

const Index = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const [modeId, setModeId] = useState<(typeof MODES)[number]['id']>('v2');
  const activeMode = MODES.find((m) => m.id === modeId) ?? MODES[0];
  useReveal();

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const flat = window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)').matches;
    if (flat) { el.style.setProperty('--hero-p', '1'); return; }
    let frame = 0;
    const update = () => {
      const p = Math.min(Math.max(window.scrollY / (window.innerHeight * 0.55), 0), 1);
      el.style.setProperty('--hero-p', p.toFixed(3));
    };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);

  const copyInstall = () => navigator.clipboard.writeText(INSTALL).then(() => toast.success('Install command copied'));

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="home-page">
      <SEO title="sdev — write code the way you speak" description="sdev is a self-hosting programming language that reads like everyday language, runs instantly in your browser through WebAssembly and compiles to native x86-64." path="/" />
      <SiteNav />

      <main>
        <section ref={heroRef} data-testid="home-hero" className="relative overflow-hidden">
          <div className="wrap pt-10 sm:pt-14">
            <div className="flex items-center justify-between border-b border-foreground/15 pb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <span>sdev {releaseInfo.version} — self-hosted toolchain</span>
              <span className="hidden sm:inline">WebAssembly · Native x86-64 · 26 languages</span>
            </div>
            <div className="grid gap-10 pt-12 lg:grid-cols-12 lg:pt-16">
              <div className="lg:col-span-8">
                <h1 data-testid="home-hero-title" className="font-display font-extrabold leading-[0.92] tracking-[-0.045em] text-[15vw] sm:text-7xl lg:text-[6.6rem] xl:text-[7.4rem]">
                  <span className="mask-line"><span>Write code</span></span>
                  <span className="mask-line"><span style={{ ['--d' as string]: '110ms' }}>the way you</span></span>
                  <span className="mask-line"><span style={{ ['--d' as string]: '220ms' }}><span className="serif-i text-primary">speak.</span><span className="ml-3 inline-block h-[0.62em] w-[0.36em] translate-y-[0.02em] bg-[hsl(var(--lime))] align-baseline animate-pulse" /></span></span>
                </h1>
                <p className="rv mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground" style={{ ['--d' as string]: '300ms' }}>
                  sdev is a programming language that reads like everyday language, runs instantly in your browser, and compiles to fast native programs. Even its own compiler is written in sdev.
                </p>
                <div className="rv mt-9 flex flex-wrap items-center gap-3" style={{ ['--d' as string]: '380ms' }}>
                  <Link to="/ide" data-testid="hero-open-ide" className="btn-ink">Open the IDE <ArrowRight className="h-4 w-4" /></Link>
                  <a href="#try" data-testid="hero-try" className="btn-line">Run it here</a>
                  <button data-testid="hero-copy-install" onClick={copyInstall} className="group ml-1 inline-flex items-center gap-2 font-mono text-sm text-muted-foreground hover:text-foreground">
                    <span className="text-primary">$</span>{INSTALL}<Copy className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                  </button>
                </div>
              </div>
              <dl className="rv lg:col-span-4 lg:pt-4" data-testid="hero-specs" style={{ ['--d' as string]: '200ms' }}>
                {SPECS.map(([k, v, d]) => (
                  <div key={k} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-b border-foreground/15 py-4 first:border-t">
                    <dt className="text-sm font-medium">{k}<span className="block text-xs font-normal text-muted-foreground">{d}</span></dt>
                    <dd className="font-display text-4xl font-bold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="wrap mt-16 pb-20 sm:mt-20"><HeroFrame /></div>
        </section>

        <div className="ink overflow-hidden border-y border-border py-5" data-testid="home-ticker" aria-hidden="true">
          <div className="ticker">
            {[...FORGES, ...FORGES].map(([lang, word], i) => (
              <span key={i} className="flex items-baseline gap-3 px-7 whitespace-nowrap">
                <span className="font-display text-3xl font-bold sm:text-4xl">{word}</span>
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{lang}</span>
                <span className="ml-7 text-[hsl(var(--lime))]">/</span>
              </span>
            ))}
          </div>
        </div>

        <Section id="try" n="01" kicker="Try it" title={<>Real compiler. <span className="serif-i font-normal text-primary">Right here.</span></>}>
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="rv lg:col-span-3 space-y-4 text-muted-foreground">
              <p>Every Run below goes through the same lexer, parser, interpreter and bytecode compiler the IDE uses — console, 2D canvas, and HTML apps included.</p>
              <p className="text-sm">Pick an example, edit it, inspect its VM bytecode, or press <kbd className="rounded border border-border px-1 font-mono text-xs">⌘↵</kbd>.</p>
            </div>
            <div className="rv lg:col-span-9" style={{ ['--d' as string]: '120ms' }}><LivePlayground /></div>
          </div>
        </Section>

        <Section n="02" kicker="Editions" title={<>Four ways in. <span className="serif-i font-normal text-primary">One runtime underneath.</span></>}>
          <div className="rv grid gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-12" data-testid="home-editions">
            <div className="bg-card p-4 sm:p-6 lg:col-span-5 flex flex-col gap-2">
              {MODES.map((m) => {
                const active = m.id === activeMode.id;
                return (
                  <button
                    key={m.id}
                    data-testid={`edition-tab-${m.id}`}
                    onClick={() => setModeId(m.id)}
                    className={`rounded-xl border p-4 text-left transition-colors ${active ? 'border-foreground bg-foreground text-background' : 'border-border bg-background/50 hover:border-foreground/40'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xl font-bold">{m.label}</span>
                      <span className={`font-mono text-[10px] uppercase tracking-wider ${active ? 'text-[hsl(var(--lime))]' : 'text-muted-foreground'}`}>{m.tag}</span>
                    </div>
                    <p className={`mt-1.5 text-xs leading-relaxed ${active ? 'text-background/80' : 'text-muted-foreground'}`}>{m.summary}</p>
                  </button>
                );
              })}
            </div>
            <div className="ink p-6 sm:p-8 lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="font-mono text-xs text-muted-foreground">{activeMode.label}</span>
                  <button
                    data-testid="edition-open-ide"
                    onClick={() => openInIde(activeMode.code, activeMode.id, navigate)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--lime))] px-3 py-1 font-mono text-[11px] font-semibold text-[hsl(var(--ink))]"
                  >
                    <ExternalLink className="h-3 w-3" /> Open in IDE
                  </button>
                </div>
                <SdevCode code={activeMode.code} numbered className="py-5" />
              </div>
              <p className="border-t border-border pt-4 font-mono text-xs text-muted-foreground">{activeMode.note}</p>
            </div>
          </div>
        </Section>

        <Section n="03" kicker="Dialects" title={<>One language, <span className="serif-i font-normal text-primary">twenty-six</span> ways to write it.</>}>
          <p className="rv -mt-6 mb-10 max-w-2xl text-muted-foreground">Keywords are built into the lexer for 26 human languages. Pick a place on the map, read the keyword table, and run the same program written in that language.</p>
          <div className="rv"><DialectMap /></div>
        </Section>

        <section className="ink" data-testid="home-selfhost">
          <div className="wrap grid gap-14 py-24 sm:py-32 lg:grid-cols-12">
            <div className="rv lg:col-span-5">
              <p className="label">§04 — Self-hosting</p>
              <h2 className="mt-6 font-display text-4xl font-bold leading-[1.02] sm:text-5xl lg:text-6xl">It compiles itself. <span className="serif-i font-normal text-[hsl(var(--lime))]">Byte for byte.</span></h2>
              <p className="mt-6 max-w-md text-muted-foreground">The lexer, parser and code generator are written in sdev. Every change must rebuild the compiler with itself and produce identical output.</p>
              <div className="mt-10 grid grid-cols-[repeat(29,minmax(0,1fr))] gap-[3px]" aria-hidden="true">
                {Array.from({ length: 87 }).map((_, i) => <span key={i} className="rv aspect-square rounded-[2px] bg-[hsl(var(--lime))]" style={{ ['--d' as string]: `${i * 12}ms` }} />)}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="font-mono text-xs text-muted-foreground">87 of 87 checks passed</p>
                <Link to="/docs/self-hosting-design-guide" className="font-mono text-xs text-[hsl(var(--lime))] hover:underline">Read the engineering monograph →</Link>
              </div>
            </div>
            <ol className="lg:col-span-7 lg:pl-8">
              {STAGES.map(([k, cmd, d], i) => (
                <li key={k} className="rv grid grid-cols-[5.5rem_1fr] gap-4 border-t border-border py-6 last:border-b" style={{ ['--d' as string]: `${i * 90}ms` }}>
                  <span className={`font-mono text-xs uppercase tracking-widest ${i === 3 ? 'text-[hsl(var(--lime))]' : 'text-muted-foreground'}`}>{k}</span>
                  <span>
                    <code className="font-mono text-base sm:text-lg">{cmd}</code>
                    <span className="mt-1 block text-sm text-muted-foreground">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <Section n="05" kicker="Targets" title={<>Write once. <span className="serif-i font-normal text-primary">Ship it anywhere.</span></>}>
          <div className="rv overflow-hidden rounded-2xl border border-border bg-card" data-testid="home-targets">
            {TARGETS.map((t, i) => {
              const inner = (
                <>
                  <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-display text-xl font-bold sm:text-2xl">{t.t}</span>
                  <span className="hidden text-sm text-muted-foreground md:block">{t.how}</span>
                  <span className="hidden font-mono text-xs text-muted-foreground sm:block">{t.file}</span>
                  <ArrowUpRight className="h-4 w-4 justify-self-end transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </>
              );
              const cls = 'group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 border-b border-border px-5 py-5 last:border-b-0 transition-colors hover:bg-[hsl(var(--lime)/0.25)] sm:grid-cols-[2.5rem_1fr_auto_auto] md:grid-cols-[2.5rem_1.1fr_1.6fr_1fr_auto] sm:px-8';
              return t.href.startsWith('/downloads') ? <a key={t.t} href={t.href} download data-testid={`target-${i}`} className={cls}>{inner}</a> : <Link key={t.t} to={t.href} data-testid={`target-${i}`} className={cls}>{inner}</Link>;
            })}
          </div>
        </Section>

        <Section n="06" kicker="Learn" title={<>Everything is <span className="serif-i font-normal text-primary">open to read.</span></>}>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: BookOpen, t: 'The sdev Book', d: 'The complete guide — second edition. Available in English and Bulgarian.', href: '/sdev-book-en.pdf', cta: 'Download PDF', ext: true },
              { icon: Download, t: 'Documentation', d: 'Language reference, v2 stdlib, OCE causal engine, compiler internals and tooling.', href: '/docs', cta: 'Read the docs' },
              { icon: Puzzle, t: 'Dialect Studio', d: 'Rename every keyword, pick your own block style, and publish your version of sdev.', href: '/dialects', cta: 'Build a dialect' },
            ].map((c, i) => {
              const body = (
                <div className="flex h-full min-h-[240px] flex-col rounded-2xl border border-border bg-card p-7 transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-foreground/40">
                  <c.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-10 font-display text-2xl font-bold">{c.t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
                  <span className="mt-auto pt-6 inline-flex items-center gap-1.5 text-sm font-medium">{c.cta} <ArrowRight className="h-4 w-4" /></span>
                </div>
              );
              return (
                <div key={c.t} className="rv" style={{ ['--d' as string]: `${i * 90}ms` }}>
                  {c.ext ? <a href={c.href} data-testid={`learn-${i}`} className="block h-full">{body}</a> : <Link to={c.href} data-testid={`learn-${i}`} className="block h-full">{body}</Link>}
                </div>
              );
            })}
          </div>
          <div className="rv mt-4 flex flex-wrap gap-3 text-sm">
            <Link to="/libraries" className="btn-line"><Library className="h-4 w-4" /> Libraries</Link>
            <Link to="/extensions" className="btn-line"><Puzzle className="h-4 w-4" /> Extensions</Link>
            <Link to="/explore" className="btn-line">Community showcase <ArrowUpRight className="h-4 w-4" /></Link>
            <Link to="/docs/self-hosting-design-guide" className="btn-line">Self-hosting design guide <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
        </Section>

        <section className="wrap pb-24 sm:pb-32">
          <div className="ink rv relative overflow-hidden rounded-3xl border border-border px-6 py-16 sm:px-14 sm:py-24" data-testid="home-cta">
            <div className="dots absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative grid gap-10 lg:grid-cols-12 lg:items-end">
              <h2 className="lg:col-span-8 font-display text-5xl font-extrabold leading-[0.95] sm:text-6xl lg:text-7xl">Your first program is <span className="serif-i font-normal text-[hsl(var(--lime))]">one click</span> away.</h2>
              <div className="lg:col-span-4 flex flex-wrap gap-3 lg:justify-end">
                <Link to="/ide" data-testid="cta-open-ide" className="btn-lime">Open the IDE <ArrowRight className="h-4 w-4" /></Link>
                <Link to="/docs" data-testid="cta-docs" className="btn-line !border-foreground/30">Read the docs</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <SdevChatbot onInsertCode={(c) => openInIde(c, 'assistant', navigate)} />
    </div>
  );
};

export default Index;
