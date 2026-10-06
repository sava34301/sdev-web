import { useState, useCallback, useRef, useEffect } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { SEO } from '@/components/SEO';
import { useNavigate } from 'react-router-dom';
import { CodeEditor } from '@/components/CodeEditor';
import { OutputPanel } from '@/components/OutputPanel';
import { ExampleCode } from '@/components/ExampleCode';
import { LanguageReference } from '@/components/LanguageReference';
import { CanvasPanel, CanvasHandle } from '@/components/CanvasPanel';
import { DownloadablesDropdown } from '@/components/DownloadablesDropdown';
import { CodeTranslator } from '@/components/CodeTranslator';
import { SdevChatbot } from '@/components/SdevChatbot';
import { CompilerPanel } from '@/components/CompilerPanel';
import { HeroDemo } from '@/components/home/HeroDemo';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play, Terminal, Cpu, MonitorDot, Wand2,
  ArrowRight, Palette, BookOpen,
  Timer, Trash2, Share2, Copy, Check, ChevronDown,
  Recycle, Globe2, Layers, UserCircle, History, ExternalLink,
  GraduationCap, Rocket, Code2, Download,
} from 'lucide-react';
import { GraphicsCommand, TurtleState, createGraphicsBuiltins } from '@/lang/graphics';
import { Lexer } from '@/lang/lexer';
import { Parser } from '@/lang/parser';
import { Interpreter } from '@/lang/interpreter';
import { Environment } from '@/lang/environment';
import { createBuiltins } from '@/lang/builtins';
import { SdevError } from '@/lang/errors';
import sdevLogo from '@/assets/sdev-logo.png';

const DEFAULT_CODE = `// Welcome to sdev!

forge message be "Hello, World!"
speak(message)
`;

/** The four stages shown in "How it works"; each maps to one panel in the 3D stack. */
const STEPS = [
  {
    title: 'Write it your way',
    body: 'Use sdev keywords, plain English sentences, or your own language. Beginners and experts write in the same file.',
    panel: { label: 'greeting.sdev', lines: ['ask "What is your name?" as name', 'say Hello, name', '', 'forge total be 12 * 4', 'speak(total)'] },
  },
  {
    title: 'It understands you',
    body: 'Before anything runs, sdev reads your intent and turns everyday phrasing into precise code. Programs that already work are left exactly as written.',
    panel: { label: 'understood as', lines: ['forge name be ask("What is your name?")', 'speak("Hello, " + name)', '', 'forge total be 12 * 4', 'speak(total)'] },
  },
  {
    title: 'Compiled by itself',
    body: 'The lexer, parser and code generator are written in sdev. Compiling the compiler with itself gives the same bytes every time.',
    panel: { label: 'bytecode', lines: ['0000  PUSH_STR   "What is…"', '0002  CALL       ask', '0004  STORE_GLB  name', '0006  PUSH_INT   48', '0008  CALL       speak'] },
  },
  {
    title: 'Runs everywhere',
    body: 'Instantly in your browser through WebAssembly, or as a small native x86-64 program on your computer — no extra libraries needed.',
    panel: { label: 'targets', lines: ['✓ seed.wasm        browser · 0.4 ms start', '✓ greeting         x86-64 · static · 14 KB', '', '$ ./greeting', 'What is your name? Ada'] },
  },
];

const KEYWORD_LANGS = [
  { word: 'forge', lang: 'English' },
  { word: 'създай', lang: 'Bulgarian' },
  { word: 'forja', lang: 'Spanish' },
  { word: '作る', lang: 'Japanese' },
  { word: 'schmiede', lang: 'German' },
];

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

const Index = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [graphicsCommands, setGraphicsCommands] = useState<GraphicsCommand[]>([]);
  const [showCanvas, setShowCanvas] = useState(false);
  const [showTranslator, setShowTranslator] = useState(false);
  const [showCompiler, setShowCompiler] = useState(false);
  const [execTime, setExecTime] = useState<number>();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('output');
  const [step, setStep] = useState(0);
  const [kw, setKw] = useState(0);
  const [cliCopied, setCliCopied] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);
  const playgroundRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLDListElement>(null);

  const runCode = useCallback(() => {
    const outputLines: string[] = [];
    const commands: GraphicsCommand[] = [];
    let turtleState: TurtleState = { x: 200, y: 200, angle: -90, penDown: true, color: '#3B82F6', width: 2 };

    try {
      const t0 = performance.now();
      const lexer = new Lexer(code, { sourceLanguage: 'auto' });
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const env = new Environment();
      const builtins = createBuiltins((msg) => outputLines.push(msg));
      builtins.forEach((fn, name) => env.define(name, fn));
      env.define('PI', Math.PI);
      env.define('TAU', Math.PI * 2);
      env.define('E', Math.E);

      const gfxBuiltins = createGraphicsBuiltins(
        (cmd) => commands.push(cmd),
        () => turtleState,
        (state) => { turtleState = { ...turtleState, ...state }; }
      );
      gfxBuiltins.forEach((fn, name) => env.define(name, fn));

      const interpreter = new Interpreter((msg) => outputLines.push(msg));
      (interpreter as unknown as { globalEnv: Environment }).globalEnv = env;
      interpreter.interpret(ast);
      const t1 = performance.now();

      setRunTick(n => n + 1);
      setExecTime(Math.round((t1 - t0) * 100) / 100);
      setOutput(outputLines);
      setError(undefined);
      setGraphicsCommands(commands);
      if (commands.length > 0) {
        setShowCanvas(true);
        setActiveTab('canvas');
      } else {
        setActiveTab('output');
      }
    } catch (e) {
      setRunTick(n => n + 1);
      setOutput(outputLines);
      setError(e instanceof SdevError ? e.message : String(e));
    }
  }, [code]);

  const handleExampleSelect = useCallback((exampleCode: string) => {
    setCode(exampleCode);
    setOutput([]);
    setError(undefined);
    setGraphicsCommands([]);
    setExecTime(undefined);
  }, []);

  const handleTranslatedCode = useCallback((translatedCode: string) => {
    setCode(translatedCode);
    setShowTranslator(false);
    setOutput([]);
    setError(undefined);
    setGraphicsCommands([]);
  }, []);

  const handleClearOutput = useCallback(() => {
    setOutput([]);
    setError(undefined);
    setExecTime(undefined);
  }, []);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleShare = useCallback(() => {
    const encoded = btoa(encodeURIComponent(code));
    navigator.clipboard.writeText(`${window.location.origin}/?code=${encoded}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  useEffect(() => {
    try {
      const shared = new URLSearchParams(window.location.search).get('code');
      if (shared) setCode(decodeURIComponent(atob(shared)));
    } catch { /* ignore malformed share links */ }
  }, []);

  const [runTick, setRunTick] = useState(0);
  const [lastFile, setLastFile] = useState<string | null>(null);

  const openInIde = useCallback((src: string, name = 'playground') => {
    sessionStorage.setItem('sdev:imported_code', src);
    sessionStorage.setItem('sdev:imported_name', name);
    navigate('/ide');
  }, [navigate]);

  // ⌘I / Ctrl+I (or plain "i" outside text fields) jumps to the IDE. Edited playground
  // code is carried along so a shortcut never throws away the visitor's work.
  const codeRef = useRef(code);
  codeRef.current = code;
  useEffect(() => {
    const go = () => {
      const current = codeRef.current;
      if (current !== DEFAULT_CODE) openInIde(current, 'playground');
      else navigate('/ide');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.isComposing) return;
      const t = e.target as HTMLElement;
      const typing = t.closest('input, textarea, select, [contenteditable="true"], .cm-editor, [role="dialog"]');
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'i') {
        // Chat and other inputs keep ⌘I for themselves; the playground editor carries its code over.
        if (typing && !t.closest('.home-playground')) return;
        e.preventDefault();
        go();
      } else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'i') {
        go();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, openInIde]);

  // One passive scroll listener: hero depth and the "How it works" card stack.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let lastStep = -1;
    const update = () => {
      const vh = Math.max(window.innerHeight, 1);
      const hero = heroRef.current;
      if (hero && !reduce) {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--hp', clamp01(-r.top / Math.max(r.height, 1)).toFixed(3));
      }
      const how = howRef.current;
      const stack = stackRef.current;
      if (how && stack) {
        const r = how.getBoundingClientRect();
        const p = clamp01(-r.top / Math.max(r.height - vh, 1));
        const pos = p * (STEPS.length - 1); // 0..3, continuous
        how.style.setProperty('--how', p.toFixed(4));
        const s = Math.min(STEPS.length - 1, Math.round(pos));
        if (s !== lastStep) { lastStep = s; setStep(s); }
        if (!reduce) {
          Array.from(stack.children).forEach((el, i) => {
            const d = i - pos; // <0 already passed, 0 active, >0 waiting behind
            const card = el as HTMLElement;
            if (d < 0) {
              const k = Math.min(-d, 1);
              card.style.transform = `translate3d(0, ${(-k * 60).toFixed(1)}px, ${(k * 160).toFixed(1)}px) rotateX(${(k * 8).toFixed(2)}deg)`;
              card.style.opacity = (1 - k).toFixed(3);
            } else {
              card.style.transform = `translate3d(0, ${(-d * 34).toFixed(1)}px, ${(-d * 90).toFixed(1)}px)`;
              card.style.opacity = Math.max(0, 1 - d * 0.28).toFixed(3);
            }
            card.style.zIndex = String(100 - i);
            card.toggleAttribute('data-active', Math.abs(d) < 0.5);
          });
        }
      }
    };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  // Returning visitors: remember the file they last had open in the IDE
  useEffect(() => {
    try {
      const files = JSON.parse(localStorage.getItem('sdev-ide-files') || '[]') as { id: string; name: string }[];
      const active = JSON.parse(localStorage.getItem('sdev-ide-active') || 'null');
      const f = files.find(x => x.id === active) || files[files.length - 1];
      if (f?.name) setLastFile(f.name);
    } catch { /* no saved workspace */ }
  }, []);

  // Reveal sections as they scroll in
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -10% 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Numbers count up once
  useEffect(() => {
    const dl = statsRef.current;
    if (!dl) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      dl.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
        const to = Number(el.dataset.count);
        const t0 = performance.now();
        const tick = (now: number) => {
          const k = Math.min((now - t0) / 1200, 1);
          el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    io.observe(dl);
    return () => io.disconnect();
  }, []);

  // Keyword shown in many human languages
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setKw((k) => (k + 1) % KEYWORD_LANGS.length), 2200);
    return () => window.clearInterval(id);
  }, []);

  // Soft light that follows the pointer inside feature cards
  const trackSpotlight = (e: ReactPointerEvent) => {
    const card = (e.target as HTMLElement).closest('.feature') as HTMLElement | null;
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  const scrollToPlayground = () => playgroundRef.current?.scrollIntoView({ behavior: 'smooth' });
  const jumpToStep = (i: number) => {
    const how = howRef.current;
    if (!how) return;
    const top = how.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (i / (STEPS.length - 1)) * (how.offsetHeight - window.innerHeight), behavior: 'smooth' });
  };
  const copyCli = () => {
    navigator.clipboard.writeText('npm i -g sdev-lang');
    setCliCopied(true);
    setTimeout(() => setCliCopied(false), 1800);
  };

  return (
    <div className="sdev-home min-h-screen bg-background relative">
      <SEO
        title="sdev — Self-Hosted Language, WebAssembly + Native"
        description="sdev is a self-hosted programming language with a browser IDE, WebAssembly runtime, native x86-64 compiler, and built-in machine learning stack."
        path="/"
      />

      {/* ===== NAV ===== */}
      <header className="site-nav">
        <nav className="max-w-[1240px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2.5">
              <img src={sdevLogo} alt="sdev" className="w-7 h-7 object-contain" />
              <span className="text-lg font-display text-foreground">sdev</span>
            </a>
            <div className="hidden md:flex items-center gap-1 text-sm">
              <button onClick={() => jumpToStep(0)} className="nav-link">How it works</button>
              <button onClick={scrollToPlayground} className="nav-link">Playground</button>
              <button onClick={() => navigate('/docs')} className="nav-link">Docs</button>
              <button onClick={() => navigate('/explore')} className="nav-link">Community</button>
              <DownloadablesDropdown code={code} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/account')} variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
            <Button onClick={() => navigate('/ide')} size="sm" className="gap-2 font-medium">
              Open IDE
              <kbd className="hidden md:inline px-1.5 py-0.5 rounded bg-primary-foreground/15 text-[10px] font-mono">⌘I</kbd>
            </Button>
          </div>
        </nav>
      </header>

      <main id="main">
        {/* ===== HERO (split) ===== */}
        <section ref={heroRef} className="hero">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-light" aria-hidden="true" />
          <div className="relative max-w-[1240px] mx-auto px-6 pt-32 pb-20 md:pt-40 md:pb-28 grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
            <div className="hero-copy">
              {lastFile ? (
                <button onClick={() => navigate('/ide')} className="enter group mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 pl-3 pr-1.5 py-1 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                  <History className="w-3.5 h-3.5 text-primary" />
                  Continue <span className="font-mono text-foreground">{lastFile}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs text-primary-foreground">Open <ArrowRight className="w-3 h-3" /></span>
                </button>
              ) : (
                <div className="enter mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Open source · A compiler written in itself
                </div>
              )}
              <h1 className="enter text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-[4.4rem]" style={{ animationDelay: '60ms' }}>
                Write in plain words.<br />
                <span className="text-primary">Run it anywhere.</span>
                <span className="sr-only"> — sdev, the self-hosting programming language for WebAssembly and native x86-64</span>
              </h1>
              <p className="enter mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed" style={{ animationDelay: '120ms' }}>
                sdev is a programming language that reads like everyday language, runs instantly in your browser,
                and compiles to fast native programs. Even its own compiler is written in sdev.
              </p>
              <div className="enter mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: '180ms' }}>
                <Button onClick={() => navigate('/ide')} size="lg" className="h-12 px-6 gap-2 font-medium">
                  Open the IDE <ArrowRight className="w-4 h-4" />
                </Button>
                <Button onClick={scrollToPlayground} variant="outline" size="lg" className="h-12 px-6 gap-2 bg-card/50">
                  <Play className="w-4 h-4" /> Try it here
                </Button>
              </div>
              <button onClick={copyCli} className="enter mt-6 inline-flex items-center gap-3 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ animationDelay: '240ms' }}>
                <span className="text-primary">$</span> npm i -g sdev-lang
                {cliCopied ? <Check className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="hero-visual enter" style={{ animationDelay: '200ms' }}>
              <HeroDemo onOpen={(src, name) => openInIde(src, name)} />
            </div>
          </div>

          {/* stats band */}
          <div className="relative border-y border-border bg-card/30">
            <dl ref={statsRef} className="max-w-[1240px] mx-auto grid grid-cols-2 lg:grid-cols-4">
              {[
                { v: '2', l: 'Runtimes', d: 'WebAssembly and native x86-64' },
                { v: '26', l: 'Human languages', d: 'for keywords and dialects' },
                { v: '87', l: 'Self-compile checks', d: 'byte-identical every time' },
                { v: '0', l: 'Dependencies', d: 'in native builds — no libc' },
              ].map((s) => (
                <div key={s.l} className="stat">
                  <dt className="text-sm text-foreground font-medium">{s.l}</dt>
                  <dd className="order-first font-display text-4xl md:text-5xl text-foreground" data-count={s.v}>{s.v}</dd>
                  <dd className="text-sm text-muted-foreground">{s.d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ===== HOW IT WORKS (sticky 3D stack) ===== */}
        <section ref={howRef} className="how" aria-labelledby="how-title">
          <div className="how-stage">
            <div className="max-w-[1240px] w-full mx-auto px-6 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20 items-center">
              <div>
                <div className="eyebrow">How it works</div>
                <h2 id="how-title" className="mt-3 text-4xl md:text-5xl leading-[1.05]">From a sentence to a running program.</h2>
                <ol className="mt-10 space-y-1">
                  {STEPS.map((s, i) => (
                    <li key={s.title}>
                      <button onClick={() => jumpToStep(i)} className="how-step" data-active={i === step || undefined}>
                        <span className="how-step-num">{String(i + 1).padStart(2, '0')}</span>
                        <span>
                          <span className="block text-lg font-display text-foreground">{s.title}</span>
                          <span className="how-step-body">{s.body}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="how-scene" aria-hidden="true">
                <div ref={stackRef} className="how-stack">
                  {STEPS.map((s, i) => (
                    <div key={s.title} className="how-card">
                      <div className="flex items-center justify-between border-b border-border px-5 h-11">
                        <span className="font-mono text-xs text-muted-foreground">{s.panel.label}</span>
                        <span className="font-mono text-xs text-primary">{String(i + 1).padStart(2, '0')} / 04</span>
                      </div>
                      <pre className="px-5 py-5 font-mono text-[13px] leading-7 text-foreground/90">
                        {s.panel.lines.map((l, j) => <div key={j}>{l || '\u00a0'}</div>)}
                      </pre>
                    </div>
                  ))}
                </div>
                <div className="how-progress"><span /></div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== PLAYGROUND ===== */}
        <section ref={playgroundRef} className="home-playground relative border-b border-border/60 bg-card/20">
                    <div className="max-w-[1240px] mx-auto px-6 py-20 md:py-28 reveal">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                <div className="eyebrow mb-3">Playground</div>
                <h2 className="text-4xl md:text-5xl leading-[1.05]">Try it right here.</h2>
                <p className="text-sm text-muted-foreground mt-2">Runs entirely in your browser. Nothing to install.</p>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <Button variant="ghost" size="sm" onClick={handleCopyCode} className="gap-1.5 text-xs text-muted-foreground">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5 text-xs text-muted-foreground">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openInIde(code)} className="gap-1.5 text-xs text-muted-foreground">
                  <ExternalLink className="w-3.5 h-3.5" /> Open in IDE
                </Button>
                <Button variant={showTranslator ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowTranslator(!showTranslator)} className="gap-1.5 text-xs">
                  <Wand2 className="w-3.5 h-3.5" /> Translate
                </Button>
                <Button variant={showCompiler ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowCompiler(!showCompiler)} className="gap-1.5 text-xs">
                  <Cpu className="w-3.5 h-3.5" /> Compiler
                </Button>
                <Button onClick={runCode} size="sm" className="gap-1.5 font-medium ml-1">
                  <Play className="w-3.5 h-3.5" /> Run
                  <kbd className="hidden sm:inline ml-1 px-1.5 py-0.5 rounded bg-primary-foreground/20 text-[10px] font-mono">⌘↵</kbd>
                </Button>
              </div>
            </div>

            <div className="mb-4">
              <ExampleCode onSelect={handleExampleSelect} />
            </div>

            <div className="home-playground-shell grid lg:grid-cols-5 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-[0_32px_100px_hsl(var(--background)/0.7)]">
              <div className="lg:col-span-3">
                <CodeEditor value={code} onChange={setCode} onRun={runCode} placeholder="// Write your sdev code here..." />
              </div>

              <div className="lg:col-span-2 space-y-4 bg-background p-3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                  <div className="flex items-center justify-between">
                    <TabsList className="h-9 bg-muted/30">
                      <TabsTrigger value="output" className="text-xs gap-1.5 data-[state=active]:bg-card">
                        <Terminal className="w-3.5 h-3.5" /> Output
                      </TabsTrigger>
                      {showCanvas && (
                        <TabsTrigger value="canvas" className="text-xs gap-1.5 data-[state=active]:bg-card">
                          <Palette className="w-3.5 h-3.5" /> Canvas
                        </TabsTrigger>
                      )}
                    </TabsList>
                    <div className="flex items-center gap-2">
                      {execTime !== undefined && (
                        <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                          <Timer className="w-3 h-3" /> {execTime}ms
                        </span>
                      )}
                      <Button variant="ghost" size="icon" onClick={handleClearOutput} aria-label="Clear output" title="Clear output" className="w-7 h-7 text-muted-foreground hover:text-foreground">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <TabsContent value="output" key={runTick} className={`mt-2 rounded-lg ${runTick ? 'run-pulse' : ''}`}>
                    <OutputPanel lines={output} error={error} />
                  </TabsContent>
                  <TabsContent value="canvas" className="mt-2">
                    {showCanvas && <CanvasPanel ref={canvasRef} commands={graphicsCommands} onClose={() => setShowCanvas(false)} />}
                  </TabsContent>
                </Tabs>

                {showCompiler && (
                  <CompilerPanel code={code} onOutput={(lines, err) => { setOutput(lines); setError(err); }} />
                )}
                {showTranslator && <CodeTranslator onTranslated={handleTranslatedCode} />}
              </div>
            </div>

            <div className="mt-8">
              <details className="group">
                <summary className="flex items-center gap-3 cursor-pointer select-none py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <BookOpen className="w-4 h-4" />
                  Language reference
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="pt-2">
                  <LanguageReference />
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* ===== FEATURES (bento) ===== */}
        <section className="max-w-[1240px] mx-auto px-6 py-24 md:py-32" aria-labelledby="features-title">
          <div className="reveal max-w-2xl">
            <div className="eyebrow">Why sdev</div>
            <h2 id="features-title" className="mt-3 text-4xl md:text-5xl leading-[1.05]">Simple on the surface. Serious underneath.</h2>
            <p className="mt-4 text-lg text-muted-foreground">Everything you need to learn, build and ship — and every layer stays open for you to inspect.</p>
          </div>
          <div onPointerMove={trackSpotlight} className="mt-14 grid gap-4 md:grid-cols-6">
            <article className="feature reveal md:col-span-4">
              <Recycle className="w-5 h-5 text-primary" />
              <h3 className="mt-5 text-xl">It builds itself, byte for byte</h3>
              <p className="mt-2 text-muted-foreground max-w-md">The compiler is written in sdev. Compile it with itself and the output never changes — every update must pass that check.</p>
              <pre className="mt-6 rounded-lg border border-border bg-background/70 p-4 font-mono text-[12.5px] leading-6 text-muted-foreground overflow-x-auto">
<span className="text-primary">$</span> sdev build compiler.sdev -o stage1{'\n'}<span className="text-primary">$</span> ./stage1 compiler.sdev -o stage2{'\n'}<span className="text-primary">$</span> cmp stage1 stage2{'\n'}<span className="text-brand-green">identical · 87 of 87 checks passed</span>
              </pre>
            </article>
            <article className="feature reveal md:col-span-2" style={{ transitionDelay: '80ms' }}>
              <Globe2 className="w-5 h-5 text-primary" />
              <h3 className="mt-5 text-xl">Code in your own language</h3>
              <p className="mt-2 text-muted-foreground">Keywords work in 26 human languages, and you can publish your own dialect.</p>
              <div className="mt-8 h-16 relative overflow-hidden" aria-live="off">
                {KEYWORD_LANGS.map((k, i) => (
                  <div key={k.word} className="kw" data-active={i === kw || undefined}>
                    <span className="font-mono text-3xl text-foreground">{k.word}</span>
                    <span className="ml-3 text-sm text-muted-foreground">{k.lang}</span>
                  </div>
                ))}
              </div>
            </article>
            <article className="feature reveal md:col-span-2">
              <Wand2 className="w-5 h-5 text-primary" />
              <h3 className="mt-5 text-xl">Understands what you mean</h3>
              <p className="mt-2 text-muted-foreground">Type “calculate 23 - 21” or “ask for their name” and it just runs.</p>
            </article>
            <article className="feature reveal md:col-span-2" style={{ transitionDelay: '80ms' }}>
              <Layers className="w-5 h-5 text-primary" />
              <h3 className="mt-5 text-xl">Browser and native</h3>
              <p className="mt-2 text-muted-foreground">Instant WebAssembly in any browser, small static binaries on your machine.</p>
            </article>
            <article className="feature reveal md:col-span-2" style={{ transitionDelay: '160ms' }}>
              <Cpu className="w-5 h-5 text-primary" />
              <h3 className="mt-5 text-xl">Machine learning built in</h3>
              <p className="mt-2 text-muted-foreground">Tensors, training loops and transformers, with GPU fast paths.</p>
            </article>
          </div>
        </section>

        {/* ===== ZIGZAG ===== */}
        <section className="border-t border-border bg-card/20">
          <div className="max-w-[1240px] mx-auto px-6 py-24 md:py-32 space-y-24 md:space-y-32">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="reveal reveal-left">
                <GraduationCap className="w-6 h-6 text-primary" />
                <h2 className="mt-5 text-3xl md:text-4xl leading-tight">Friendly enough for a first program.</h2>
                <p className="mt-4 text-lg text-muted-foreground leading-relaxed">New programmers write the way they think. A mini quiz with a score takes a few lines — no rules to memorise first.</p>
                <ul className="mt-6 space-y-2.5 text-muted-foreground">
                  {['Plain-language input and output', 'Clear error messages that suggest a fix', 'Runs in the browser — nothing to install'].map((t) => (
                    <li key={t} className="flex gap-3"><Check className="w-5 h-5 text-primary shrink-0" />{t}</li>
                  ))}
                </ul>
              </div>
              <div className="reveal reveal-right code-card">
                <div className="code-card-head">quiz.sdev</div>
                <pre>{`score is 0
ask "What is 2 + 2?" as answer
when answer is 4
  add 1 to score
say "You got [score] out of 1"`}</pre>
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="reveal reveal-left lg:order-2">
                <Rocket className="w-6 h-6 text-primary" />
                <h2 className="mt-5 text-3xl md:text-4xl leading-tight">Powerful enough to ship.</h2>
                <p className="mt-4 text-lg text-muted-foreground leading-relaxed">The same language compiles to native x86-64, flashes firmware to hardware, and drives a full machine-learning stack.</p>
                <ul className="mt-6 space-y-2.5 text-muted-foreground">
                  {['Command-line tool, VS Code extension and desktop app', 'Packages shared with one command', 'Readable assembly output you can inspect'].map((t) => (
                    <li key={t} className="flex gap-3"><Check className="w-5 h-5 text-primary shrink-0" />{t}</li>
                  ))}
                </ul>
              </div>
              <div className="reveal reveal-right code-card lg:order-1">
                <div className="code-card-head">terminal</div>
                <pre>{`$ sdev native app.sdev -o app
  compiled → app (x86-64, static, 18 KB)
$ ./app
  Server ready on :8080
$ sdev ext publish my-dialect
  published @you/my-dialect`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* ===== GET STARTED ===== */}
        <section className="max-w-[1240px] mx-auto px-6 py-24 md:py-32" aria-labelledby="start-title">
          <div className="reveal text-center max-w-2xl mx-auto">
            <div className="eyebrow">Get started</div>
            <h2 id="start-title" className="mt-3 text-4xl md:text-5xl leading-[1.05]">Pick how you want to work.</h2>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <button onClick={() => navigate('/ide')} className="path reveal text-left">
              <MonitorDot className="w-6 h-6 text-primary" />
              <h3 className="mt-5 text-xl">Browser IDE</h3>
              <p className="mt-2 text-muted-foreground">Files, terminal, debugger and an assistant. Nothing to install.</p>
              <span className="path-cta">Open the IDE <ArrowRight className="w-4 h-4" /></span>
            </button>
            <button onClick={copyCli} className="path reveal text-left" style={{ transitionDelay: '80ms' }}>
              <Terminal className="w-6 h-6 text-primary" />
              <h3 className="mt-5 text-xl">Command line</h3>
              <p className="mt-2 text-muted-foreground font-mono text-sm">npm i -g sdev-lang</p>
              <span className="path-cta">{cliCopied ? 'Copied' : 'Copy command'} {cliCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</span>
            </button>
            <button onClick={() => navigate('/docs')} className="path reveal text-left" style={{ transitionDelay: '160ms' }}>
              <BookOpen className="w-6 h-6 text-primary" />
              <h3 className="mt-5 text-xl">Documentation</h3>
              <p className="mt-2 text-muted-foreground">The sdev Book, the full reference and how the compiler works.</p>
              <span className="path-cta">Read the docs <ArrowRight className="w-4 h-4" /></span>
            </button>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="final">
          <div className="hero-grid" aria-hidden="true" />
          <div className="relative max-w-[1240px] mx-auto px-6 py-28 md:py-36 text-center reveal">
            <h2 className="text-4xl md:text-6xl leading-[1.05]">Start building in your browser.</h2>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">Free and open source. Your first program is one click away.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate('/ide')} size="lg" className="h-12 px-6 gap-2 font-medium">Open the IDE <ArrowRight className="w-4 h-4" /></Button>
              <Button onClick={() => navigate('/docs')} variant="outline" size="lg" className="h-12 px-6 gap-2 bg-card/50"><Download className="w-4 h-4" /> Install & docs</Button>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="border-t border-border bg-card/40">
          <div className="max-w-[1240px] mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img src={sdevLogo} alt="" className="w-6 h-6 object-contain" />
              <span className="font-display text-foreground">sdev</span>
              <span className="text-sm text-muted-foreground">— a language that builds itself</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <button onClick={() => navigate('/docs')} className="hover:text-foreground transition-colors">Docs</button>
              <button onClick={() => navigate('/ide')} className="hover:text-foreground transition-colors">IDE</button>
              <button onClick={() => navigate('/account')} className="hover:text-foreground transition-colors">Account</button>
              <button onClick={() => navigate('/privacy')} className="hover:text-foreground transition-colors">Privacy</button>
              <button onClick={() => navigate('/terms')} className="hover:text-foreground transition-colors">Terms</button>
              <span className="font-mono text-xs">v2.0.0</span>
            </div>
          </div>
          <div className="max-w-[1240px] mx-auto px-6 pb-8 text-center text-xs text-muted-foreground">
            <a href="https://sdev.codes" className="hover:text-foreground transition-colors">SDEV Programming Language</a> © 2026 by <a href="https://web.sdev.codes/" className="hover:text-foreground transition-colors">Sava Milanov</a> is licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="hover:text-foreground transition-colors">Creative Commons Attribution-ShareAlike 4.0 International</a>
            <img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" className="inline-block max-w-[1em] max-h-[1em] ml-[0.2em]" />
            <img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" className="inline-block max-w-[1em] max-h-[1em] ml-[0.2em]" />
            <img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="" className="inline-block max-w-[1em] max-h-[1em] ml-[0.2em]" />
          </div>
        </footer>
      </main>

      <SdevChatbot onInsertCode={(c) => {
        setCode(c);
        setOutput([]);
        setError(undefined);
        setGraphicsCommands([]);
      }} />
    </div>
  );
};

export default Index;
