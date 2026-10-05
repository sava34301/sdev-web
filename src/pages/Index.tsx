import type { PointerEvent as ReactPointerEvent } from 'react';
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
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play, Terminal, Cpu, MonitorDot, Wand2,
  ArrowRight, Code2, Palette, Box, BookOpen,
  Timer, Trash2, Share2, Copy, Check, ChevronDown,
  Recycle, Globe2, Layers, UserCircle, Binary, History, ExternalLink,
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
  const pageRef = useRef<HTMLDivElement>(null);

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

  // One passive scroll listener drives the dimensional scenes without blocking native scrolling.
  useEffect(() => {
    let frame = 0;
    const updateScene = () => {
      const root = pageRef.current;
      if (!root) return;
      const viewport = Math.max(window.innerHeight, 1);
      const heroProgress = Math.min(Math.max(window.scrollY / viewport, 0), 1.35);
      const pageProgress = Math.min(window.scrollY / Math.max(document.documentElement.scrollHeight - viewport, 1), 1);
      root.style.setProperty('--hero-scroll', heroProgress.toFixed(3));
      root.style.setProperty('--page-scroll', pageProgress.toFixed(3));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateScene);
    };
    updateScene();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
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

  const trackSpotlight = (e: ReactPointerEvent) => {
    const card = (e.target as HTMLElement).closest('.bento') as HTMLElement | null;
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  const scrollToPlayground = () => playgroundRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div ref={pageRef} className="sdev-home min-h-screen bg-background relative overflow-clip">
      <SEO
        title="sdev — Self-Hosted Language, WebAssembly + Native"
        description="sdev is a self-hosted programming language with a browser IDE, WebAssembly runtime, native x86-64 compiler, and built-in machine learning stack."
        path="/"
      />
      <div className="home-atmosphere fixed inset-0 pointer-events-none" aria-hidden="true" />

      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-2xl">
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
        {/* ===== HERO ===== */}
        <section className="home-hero relative min-h-[calc(100svh-4rem)] flex items-center border-b border-border/50">
          <div className="home-grid-floor absolute inset-x-0 bottom-0 h-[52%] pointer-events-none" aria-hidden="true" />
          <div className="home-orbit home-orbit-a" aria-hidden="true" />
          <div className="home-orbit home-orbit-b" aria-hidden="true" />
          <div className="relative z-10 max-w-[1440px] w-full mx-auto px-6 py-16 md:py-24">
           <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-14 lg:gap-8 items-center">
            <div className="max-w-2xl home-hero-copy">
              {lastFile ? (
                <button onClick={() => navigate('/ide')} className="rise group mb-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 pl-3 pr-2 py-1 text-xs text-foreground hover:bg-primary/20 transition-colors">
                  <History className="w-3.5 h-3.5 text-primary" />
                  Continue <span className="font-mono">{lastFile}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground">Open IDE <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" /></span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/5 px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-[0.18em] text-primary mb-6 rise">
                  <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
                  Self-hosting · released 2026
                </div>
              )}
              <h1 className="rise font-display text-[3.5rem] leading-[0.86] sm:text-7xl lg:text-[6.4rem] uppercase">
                This is<br />
                <span className="gradient-text">SDEV.</span>
              </h1>
              <p className="mt-7 text-xl md:text-2xl text-foreground/80 max-w-xl leading-snug">
                The self-hosting programming language for WebAssembly and native x86-64.
              </p>
              <p className="mt-4 text-base text-muted-foreground max-w-xl leading-relaxed">
                Its lexer, parser and generator are sdev source. Rebuild it, inspect it, and verify every byte.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button onClick={scrollToPlayground} size="lg" className="gap-2 h-12 px-6 font-semibold">
                  <Play className="w-4 h-4" /> Run in browser
                </Button>
                <Button onClick={() => navigate('/docs')} variant="outline" size="lg" className="gap-2 h-12 px-6">
                  Read the docs <ArrowRight className="w-4 h-4" />
                </Button>
                <code className="hidden lg:inline-flex items-center h-12 px-4 rounded-md border border-border bg-card/60 font-mono text-sm text-muted-foreground">
                  <span className="text-primary mr-2">$</span> npm i -g sdev-lang
                </code>
              </div>
            </div>

             {/* Scroll-linked compiler object */}
             <div className="home-core-stage rise" style={{ animationDelay: '120ms' }}>
              <div className="home-core-halo" aria-hidden="true" />
              <div className="home-core-rail home-core-rail-a" aria-hidden="true" />
              <div className="home-core-rail home-core-rail-b" aria-hidden="true" />
              <div className="home-code-object" onPointerMove={trackSpotlight}>
               <div className="flex items-center gap-2 px-4 py-3 border-b border-border/70 bg-background/55 backdrop-blur-xl">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-rose/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-amber/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-green/60" />
                </div>
                <span className="text-xs font-mono text-muted-foreground ml-2">example.sdev</span>
                 <Button
                   variant="ghost"
                   size="sm"
                  onClick={() => openInIde('// a taste of sdev\nconjure greet(name) ::\n  yield "Hello, " + name + "!"\n;;\n\nforge names be ["Ada", "Grace"]\n\niterate name through names ::\n  speak(greet(name))\n;;\n', 'example')}
                   className="relative z-10 ml-auto h-7 gap-1 px-2 text-xs text-muted-foreground"
                >
                  Open in IDE <ExternalLink className="w-3 h-3" />
                 </Button>
              </div>
               <pre className="p-5 sm:p-7 text-xs sm:text-sm font-mono leading-7 text-foreground/90 overflow-x-auto">
<span className="text-muted-foreground">// a taste of sdev</span>
{'\n'}<span className="text-brand-sky">conjure</span> <span className="text-brand-amber">greet</span>(name) <span className="text-muted-foreground">::</span>
{'\n'}  <span className="text-brand-sky">yield</span> <span className="text-brand-green">"Hello, "</span> + name + <span className="text-brand-green">"!"</span>
{'\n'}<span className="text-muted-foreground">;;</span>
{'\n'}
{'\n'}<span className="text-brand-sky">forge</span> names <span className="text-primary">be</span> [<span className="text-brand-green">"Ada"</span>, <span className="text-brand-green">"Grace"</span>]
{'\n'}
{'\n'}<span className="text-brand-sky">iterate</span> name <span className="text-brand-sky">through</span> names <span className="text-muted-foreground">::</span>
{'\n'}  <span className="text-brand-amber">speak</span>(<span className="text-brand-amber">greet</span>(name))
{'\n'}<span className="text-muted-foreground">;;</span>
              </pre>
               <div className="flex items-center justify-between border-t border-border/60 bg-background/45 px-4 py-3">
                 <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> Ready to compile</span>
                 <Button size="sm" onClick={() => openInIde(code)} className="h-8 gap-1.5 text-xs"><Play className="w-3 h-3" /> Run code</Button>
               </div>
              </div>
              <div className="home-core-chip home-core-chip-wasm"><span>01</span> WASM</div>
              <div className="home-core-chip home-core-chip-native"><span>02</span> x86-64</div>
            </div>
           </div>
          </div>
        </section>


        {/* ===== PLAYGROUND ===== */}
        <section ref={playgroundRef} className="home-playground relative border-b border-border/60 bg-card/20">
          <div className="home-section-index" aria-hidden="true">01</div>
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

        {/* ===== BENTO ===== */}
        <section className="home-capabilities relative max-w-[1440px] mx-auto px-6 pb-24 pt-24 md:pt-36 reveal">
          <div className="home-section-index" aria-hidden="true">02</div>
          <div className="mb-12 md:flex md:items-end md:justify-between gap-8">
            <div><div className="rule-label mb-3 text-primary">Inside the machine</div><h2 className="text-4xl md:text-6xl uppercase max-w-3xl">A language you can inspect all the way down.</h2></div>
            <p className="mt-5 md:mt-0 max-w-md text-muted-foreground leading-relaxed">From human-language keywords to native assembly, every layer stays visible and verifiable.</p>
          </div>
          <div onPointerMove={trackSpotlight} className="grid grid-cols-1 md:grid-cols-6 auto-rows-[minmax(0,auto)] gap-4">

            {/* Fixed point — wide feature tile with code */}
            <article className="bento md:col-span-4 p-7">
              <div className="flex items-start justify-between gap-6">
                <div className="max-w-md">
                  <Recycle className="w-5 h-5 text-primary mb-4" />
                  <h2 className="text-xl mb-2">It rebuilds itself, byte for byte</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Compile the compiler with itself and the bytes don't move. Every change to the
                    language has to survive that check before it lands.
                  </p>
                </div>
                <pre className="hidden lg:block flex-1 rounded-lg border border-border/70 bg-background/60 p-4 font-mono text-[12px] leading-6 text-muted-foreground overflow-hidden">
<span className="text-primary">$</span> sdev build compiler.sdev -o c1{'\n'}
<span className="text-primary">$</span> ./c1 compiler.sdev -o c2{'\n'}
<span className="text-primary">$</span> cmp c1 c2{'\n'}
<span className="text-brand-green">  identical · 87/87 cases</span>
                </pre>
              </div>
            </article>

            {/* Two metals */}
            <article className="bento md:col-span-2 p-7">
              <Layers className="w-5 h-5 text-brand-sky mb-4" />
              <h2 className="text-xl mb-2">Two kinds of metal</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A hand-written WebAssembly seed VM in the browser, and real x86-64 assembly linked
                to a static binary with no libc on your machine.
              </p>
            </article>

            {/* ML */}
            <article className="bento md:col-span-2 p-7">
              <Cpu className="w-5 h-5 text-brand-cyan mb-4" />
              <h2 className="text-xl mb-2">Machine learning, in sdev</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tensors, autograd, transformers, training loops and checkpoints — the stack is sdev
                source, with FFI, CUDA and WebGPU fast paths beneath it.
              </p>
            </article>

            {/* Self-modification */}
            <article className="bento md:col-span-2 p-7">
              <Binary className="w-5 h-5 text-brand-amber mb-4" />
              <h2 className="text-xl mb-2">Programs that edit the language</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                sdev can read, rewrite and recompile its own source tree. Models trained in sdev can
                propose changes to sdev and prove they still hit the fixed point.
              </p>
            </article>

            {/* 26 languages */}
            <article className="bento md:col-span-2 p-7">
              <Globe2 className="w-5 h-5 text-brand-green mb-4" />
              <h2 className="text-xl mb-2">Keywords in 26 human languages</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Write <code className="font-mono text-xs text-foreground">forge</code>, or its
                Bulgarian, Japanese or Spanish equivalent. Detected and normalised before a single
                token is parsed.
              </p>
            </article>

            {/* Numbers strip */}
            <article className="bento md:col-span-6 p-0">
              <dl className="grid grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 lg:divide-x divide-border/70">
                {[
                  { v: '2', l: 'runtimes — WASM and native x86-64' },
                  { v: '0', l: 'libc dependencies in native builds' },
                  { v: '87', l: 'byte-identical fixed-point cases' },
                  { v: '26', l: 'human keyword languages' },
                ].map((s) => (
                  <div key={s.l} className="px-7 py-6">
                    <dt className="sr-only">{s.l}</dt>
                    <dd>
                      <span className="block font-display text-4xl gradient-text">{s.v}</span>
                      <span className="mt-1.5 block text-xs text-muted-foreground leading-snug">{s.l}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </article>

            {/* Toolchain links */}
            <div className="md:col-span-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

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

            {/* Graphics / maps */}
            <article className="bento md:col-span-3 p-7">
              <Palette className="w-5 h-5 text-brand-rose mb-4" />
              <h2 className="text-xl mb-2">Drawing, maps and boards</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Turtle and 2D canvas primitives, Leaflet mapping built into the language, and
                firmware you can push straight onto microcontrollers from the IDE.
              </p>
            </article>

            {/* Runtimes detail */}
            <article className="bento md:col-span-3 p-7">
              <Code2 className="w-5 h-5 text-brand-steel mb-4" />
              <h2 className="text-xl mb-2">Inspect the output</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Native builds emit GAS assembly you can read, then link with <code className="font-mono text-xs">as</code> and <code className="font-mono text-xs">ld</code>.
              </p>
              <code className="block text-xs font-mono text-muted-foreground bg-background/60 border border-border/70 rounded px-3 py-2 overflow-x-auto">
                node scripts/sdev-native.mjs prog.sdev -o prog
              </code>
            </article>
          </div>
        </section>


        {/* ===== CTA ===== */}
        <section className="home-final relative border-t border-border overflow-hidden">
          <div className="home-grid-floor absolute inset-x-0 bottom-0 h-full opacity-40 pointer-events-none" aria-hidden="true" />
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
