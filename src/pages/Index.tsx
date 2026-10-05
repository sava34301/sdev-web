import { useState, useCallback, useRef, useEffect } from 'react';
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
import { JourneyCanvas } from '@/components/home/JourneyCanvas';
import type { JourneyScene } from '@/components/home/journeyScene';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play, Terminal, Cpu, MonitorDot, Wand2,
  ArrowRight, Code2, Palette, Box, BookOpen,
  Timer, Trash2, Share2, Copy, Check, ChevronDown,
  Recycle, Globe2, Layers, UserCircle, Binary, History, ExternalLink, ArrowDown,
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

/** Chapters of the scroll-driven compiler flight; `at` is the scroll progress where each is centred. */
const CHAPTERS = [
  { at: 0.12, k: '01', label: 'Source', title: 'Written in words you already use.', body: 'forge, conjure, iterate — or their Bulgarian, Japanese or Spanish equivalents. Keywords in 26 human languages, normalised before a single token is read.' },
  { at: 0.27, k: '02', label: 'Tokens', title: 'Every word becomes a token.', body: 'A lexer written in sdev itself walks your file byte by byte, UTF-8 included, and hands the parser a clean stream.' },
  { at: 0.42, k: '03', label: 'Tree', title: 'Structure, not guesswork.', body: 'The parser builds a syntax tree you can print, inspect and transform. Plain-English intent is understood before it ever gets here.' },
  { at: 0.57, k: '04', label: 'Bytecode', title: 'A tiny stack machine.', body: 'Compact opcodes in the .sdevc format — ENTER, LOAD_LOC, CALL, RET — that you can disassemble line by line.' },
  { at: 0.73, k: '05', label: 'Two metals', title: 'WASM in your browser. x86-64 on your machine.', body: 'A hand-written WebAssembly seed VM, and real GAS assembly linked into a static binary with no libc.' },
  { at: 0.93, k: '06', label: 'Fixed point', title: 'It rebuilds itself, byte for byte.', body: 'Compile the compiler with itself and the bytes don’t move. 87 of 87 cases identical — every change has to survive that check.' },
];

const RING = [
  { icon: Recycle, tone: 'text-primary', title: 'Self-hosting fixed point', body: 'The lexer, parser and generator are sdev source and rebuild themselves identically.' },
  { icon: Layers, tone: 'text-brand-sky', title: 'Two kinds of metal', body: 'WebAssembly seed VM in the browser, static x86-64 binaries on your machine.' },
  { icon: Cpu, tone: 'text-brand-cyan', title: 'Machine learning, in sdev', body: 'Tensors, autograd, transformers and training loops — with CUDA and WebGPU fast paths.' },
  { icon: Binary, tone: 'text-brand-amber', title: 'Programs that edit the language', body: 'Read, rewrite and recompile sdev’s own source tree — and prove it still hits the fixed point.' },
  { icon: Globe2, tone: 'text-brand-green', title: '26 human languages', body: 'Write forge, or its Bulgarian, Japanese or Spanish equivalent. Dialects you can publish.' },
  { icon: Palette, tone: 'text-brand-rose', title: 'Drawing, maps and boards', body: 'Turtle and canvas graphics, Leaflet maps, and firmware pushed straight to microcontrollers.' },
  { icon: Code2, tone: 'text-brand-steel', title: 'Inspect the output', body: 'Native builds emit readable GAS assembly, linked with as and ld. Nothing hidden.' },
  { icon: Wand2, tone: 'text-brand-violet', title: 'An agent that understands you', body: '“calculate 23-21” just runs. Intent is read and repaired before the code is generated.' },
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
  const canvasRef = useRef<CanvasHandle>(null);
  const playgroundRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const railRef = useRef<HTMLOListElement>(null);
  const ringSectionRef = useRef<HTMLElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<JourneyScene | null>(null);
  const updateRef = useRef<() => void>(() => {});

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
  const onSceneReady = useCallback((scene: JourneyScene | null) => {
    sceneRef.current = scene;
    updateRef.current();
  }, []);

  // One passive scroll listener drives every scroll-linked scene: the WebGL flight,
  // the chapter overlays and the 3D feature ring. Native scrolling stays untouched.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    const update = () => {
      const vh = Math.max(window.innerHeight, 1);

      const journey = journeyRef.current;
      if (journey) {
        const r = journey.getBoundingClientRect();
        const p = clamp01(-r.top / Math.max(r.height - vh, 1));
        sceneRef.current?.setProgress(p);
        journey.style.setProperty('--jp', p.toFixed(4));
        if (!reduce) {
          const hero = heroRef.current;
          if (hero) {
            const o = clamp01(1 - p / 0.06);
            hero.style.opacity = String(o);
            hero.style.transform = `translate3d(0, ${(-p * 900).toFixed(1)}px, 0) scale(${(1 - p * 0.8).toFixed(4)})`;
            hero.style.visibility = o < 0.01 ? 'hidden' : 'visible';
          }
          let active = -1;
          CHAPTERS.forEach((c, i) => {
            const el = chapterRefs.current[i];
            if (!el) return;
            const d = p - c.at;
            const hold = i === CHAPTERS.length - 1 ? 0.07 : 0.035;
            const o = clamp01(1 - (Math.abs(d) - hold) / 0.045);
            el.style.opacity = String(o);
            el.style.transform = `translate3d(0, ${(-d * 520).toFixed(1)}px, 0) rotateX(${(d * 40).toFixed(2)}deg)`;
            el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
            if (o > 0.5) active = i;
          });
          railRef.current?.querySelectorAll('li').forEach((li, i) => li.toggleAttribute('data-active', i === active));
        }
      }

      const ringSection = ringSectionRef.current;
      const ring = ringRef.current;
      if (ringSection && ring && !reduce) {
        const r = ringSection.getBoundingClientRect();
        const q = clamp01(-r.top / Math.max(r.height - vh, 1));
        const step = 360 / RING.length;
        const rot = -q * (360 - step);
        ring.style.setProperty('--ring-rot', `${rot.toFixed(2)}deg`);
        ring.style.setProperty('--ring-tilt', `${(10 - q * 16).toFixed(2)}deg`);
        Array.from(ring.children).forEach((card, i) => {
          const facing = Math.cos(((i * step + rot) * Math.PI) / 180);
          (card as HTMLElement).style.opacity = (0.12 + 0.88 * clamp01(facing)).toFixed(3);
        });
      }
    };
    updateRef.current = update;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
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

  // ⌘I / Ctrl+I (or plain "i" outside text fields) jumps straight to the IDE
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.closest('input, textarea, select, [contenteditable="true"], .cm-editor');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); navigate('/ide'); }
      else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key === 'i') navigate('/ide');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  // Reveal sections as they scroll in
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollToPlayground = () => playgroundRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="sdev-home min-h-screen bg-background relative overflow-clip">
      <SEO
        title="sdev — Self-Hosted Language, WebAssembly + Native"
        description="sdev is a self-hosted programming language with a browser IDE, WebAssembly runtime, native x86-64 compiler, and built-in machine learning stack."
        path="/"
      />

      {/* ===== NAV ===== */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/40 backdrop-blur-xl">
        <nav className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <a href="/" className="flex items-center gap-2.5 group">
              <img src={sdevLogo} alt="sdev" className="w-7 h-7 object-contain transition-transform duration-300 group-hover:rotate-6" />
              <span className="text-lg font-display text-foreground">sdev</span>
            </a>
            <div className="hidden md:flex items-center gap-1">
              <button onClick={scrollToPlayground} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors">Playground</button>
              <button onClick={() => navigate('/docs')} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors">Docs</button>
              <DownloadablesDropdown code={code} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button onClick={() => navigate('/account')} variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </Button>
            <Button onClick={() => navigate('/ide')} size="sm" className="gap-2 font-semibold shadow-[0_0_28px_hsl(var(--primary)/0.22)]">
              <MonitorDot className="w-3.5 h-3.5" />
              Open IDE
              <kbd className="hidden md:inline ml-0.5 px-1.5 py-0.5 rounded bg-primary-foreground/20 text-[10px] font-mono">⌘I</kbd>
            </Button>
          </div>
        </nav>
      </header>

      <main id="main">
        {/* ===== 3D COMPILER FLIGHT (pinned, scroll-scrubbed) ===== */}
        <section ref={journeyRef} className="journey" aria-label="How sdev turns words into machine code">
          <div className="journey-stage">
            <div className="journey-backdrop" aria-hidden="true" />
            <JourneyCanvas onReady={onSceneReady} />
            <div className="journey-scrim" aria-hidden="true" />

            <div className="journey-copy">
              {/* Opening */}
              <div ref={heroRef} className="journey-hero">
                {lastFile ? (
                  <button onClick={() => navigate('/ide')} className="rise group mb-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 pl-3 pr-2 py-1 text-xs text-foreground hover:bg-primary/20 transition-colors">
                    <History className="w-3.5 h-3.5 text-primary" />
                    Continue <span className="font-mono">{lastFile}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground">Open IDE <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" /></span>
                  </button>
                ) : (
                  <div className="rise mb-6 inline-flex items-center gap-2 border border-primary/30 bg-primary/5 px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                    <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
                    Self-hosting · released 2026
                  </div>
                )}
                <h1 className="rise font-display uppercase journey-title">
                  This is<br />
                  <span className="gradient-text">SDEV.</span>
                  <span className="sr-only"> The self-hosting programming language for WebAssembly and native x86-64</span>
                </h1>
                <p className="rise mt-6 text-lg md:text-2xl text-foreground/80 max-w-xl leading-snug" style={{ animationDelay: '80ms' }}>
                  The self-hosting programming language for WebAssembly and native x86-64.
                </p>
                <div className="rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: '140ms' }}>
                  <Button onClick={() => navigate('/ide')} size="lg" className="gap-2 h-12 px-6 font-semibold">
                    <MonitorDot className="w-4 h-4" /> Open the IDE
                  </Button>
                  <Button onClick={scrollToPlayground} variant="outline" size="lg" className="gap-2 h-12 px-6 bg-background/40 backdrop-blur">
                    <Play className="w-4 h-4" /> Try it here
                  </Button>
                </div>
                <div className="journey-hint rise" style={{ animationDelay: '400ms' }}>
                  <ArrowDown className="w-3.5 h-3.5" /> Scroll to fly through the compiler
                </div>
              </div>

              {/* Chapters */}
              {CHAPTERS.map((c, i) => (
                <div
                  key={c.k}
                  ref={(el) => { chapterRefs.current[i] = el; }}
                  className={`journey-chapter ${i === CHAPTERS.length - 1 ? 'journey-chapter-final' : ''}`}
                >
                  <div className="rule-label text-primary mb-4"><span className="text-foreground/60">{c.k}</span> &nbsp;/&nbsp; {c.label}</div>
                  <h2 className="font-display uppercase text-4xl md:text-6xl leading-[0.92]">{c.title}</h2>
                  <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">{c.body}</p>
                  {i === CHAPTERS.length - 1 && (
                    <div className="mt-7 flex flex-wrap gap-3 justify-center">
                      <Button onClick={scrollToPlayground} size="lg" className="gap-2 h-12 px-6 font-semibold"><Play className="w-4 h-4" /> Run it yourself</Button>
                      <Button onClick={() => navigate('/docs')} variant="outline" size="lg" className="gap-2 h-12 px-6 bg-background/40 backdrop-blur">Read the internals <ArrowRight className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Progress rail */}
            <ol ref={railRef} className="journey-rail" aria-hidden="true">
              {CHAPTERS.map((c) => <li key={c.k}><span>{c.k}</span>{c.label}</li>)}
            </ol>
            <div className="journey-progress" aria-hidden="true"><span /></div>
            <button onClick={scrollToPlayground} className="journey-skip">Skip to playground <ArrowDown className="w-3 h-3" /></button>
          </div>
        </section>

        {/* ===== PLAYGROUND ===== */}
        <section ref={playgroundRef} className="home-playground relative border-b border-border/60 bg-card/20">
                    <div className="max-w-[1440px] mx-auto px-6 py-20 md:py-28 reveal">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                <div className="rule-label mb-2 text-primary">Live environment</div>
                <h2 className="text-4xl md:text-6xl uppercase">Playground</h2>
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

        {/* ===== 3D FEATURE RING (pinned, scroll-rotated) ===== */}
        <section ref={ringSectionRef} className="ring-section" aria-labelledby="ring-title">
          <div className="ring-stage">
            <div className="ring-heading">
              <div className="rule-label text-primary mb-3">Inside the machine</div>
              <h2 id="ring-title" className="font-display uppercase text-4xl md:text-6xl leading-[0.92] max-w-3xl">A language you can inspect all the way down.</h2>
            </div>
            <div className="ring-viewport">
              <div ref={ringRef} className="ring" style={{ ['--n' as string]: RING.length }}>
                {RING.map((f, i) => (
                  <article key={f.title} className="ring-card" style={{ ['--i' as string]: i }}>
                    <f.icon className={`w-6 h-6 ${f.tone}`} />
                    <h3 className="mt-6 text-xl font-display uppercase leading-tight">{f.title}</h3>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                    <span className="ring-card-index">{String(i + 1).padStart(2, '0')}</span>
                  </article>
                ))}
              </div>
              <div className="ring-floor" aria-hidden="true" />
            </div>
          </div>
        </section>

        {/* ===== NUMBERS + TOOLCHAIN ===== */}
        <section className="relative max-w-[1440px] mx-auto px-6 pb-24 reveal">
          <dl className="grid grid-cols-2 lg:grid-cols-4 border-y border-border/70 divide-x divide-border/70">
            {[
              { v: '2', l: 'runtimes — WASM and native x86-64' },
              { v: '0', l: 'libc dependencies in native builds' },
              { v: '87', l: 'byte-identical fixed-point cases' },
              { v: '26', l: 'human keyword languages' },
            ].map((s) => (
              <div key={s.l} className="px-6 py-8">
                <dt className="sr-only">{s.l}</dt>
                <dd>
                  <span className="block font-display text-5xl md:text-6xl gradient-text">{s.v}</span>
                  <span className="mt-2 block text-xs text-muted-foreground leading-snug">{s.l}</span>
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button onClick={() => navigate('/ide')} className="bento p-6 text-left">
              <MonitorDot className="w-5 h-5 text-primary mb-3" />
              <h3 className="text-base mb-1">Browser IDE</h3>
              <p className="text-sm text-muted-foreground">Files, terminal, debugger, smart assistant, live preview.</p>
            </button>
            <button onClick={() => navigate('/docs')} className="bento p-6 text-left">
              <BookOpen className="w-5 h-5 text-brand-sky mb-3" />
              <h3 className="text-base mb-1">Documentation</h3>
              <p className="text-sm text-muted-foreground">The sdev Book, full reference and compiler internals.</p>
            </button>
            <div className="bento p-6">
              <Terminal className="w-5 h-5 text-brand-amber mb-3" />
              <h3 className="text-base mb-1">CLI, VS Code, desktop</h3>
              <p className="text-sm text-muted-foreground">npm CLI, an editor extension, and a desktop app that builds native binaries.</p>
            </div>
            <div className="bento p-6">
              <Box className="w-5 h-5 text-brand-green mb-3" />
              <h3 className="text-base mb-1">Packages &amp; hardware</h3>
              <p className="text-sm text-muted-foreground">Decentralised <code className="font-mono text-xs">summon</code> packages and firmware flashed to real boards.</p>
            </div>
          </div>
        </section>


        {/* ===== CTA ===== */}
        <section className="home-final relative border-t border-border overflow-hidden">
          <div className="final-tunnel" aria-hidden="true" />
          <div className="relative max-w-[1440px] mx-auto px-6 py-28 md:py-40 text-center">
            <div className="rule-label text-primary mb-4">Your workspace is ready</div>
            <h2 className="text-4xl md:text-7xl uppercase">Start where you are.</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Open the IDE in this tab, or install the CLI and build a static binary in the next minute.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate('/ide')} size="lg" className="gap-2 h-12 px-6 font-semibold">
                <MonitorDot className="w-4 h-4" /> Open the IDE
              </Button>
              <Button onClick={() => navigate('/docs')} variant="outline" size="lg" className="gap-2 h-12 px-6">
                Documentation <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="border-t border-border bg-card/40">
          <div className="max-w-[1400px] mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
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
          <div className="max-w-[1400px] mx-auto px-6 pb-8 text-center text-xs text-muted-foreground">
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
