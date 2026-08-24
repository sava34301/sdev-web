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
  Play, Zap, Wand2, Terminal, Cpu, MonitorDot,
  ArrowRight, Code2, Palette, Box, BookOpen,
  Timer, Trash2, Share2, Copy, Check, ChevronDown,
  Rocket, Shield, Globe2, Layers, UserCircle
} from 'lucide-react';
import { GraphicsCommand, TurtleState, createGraphicsBuiltins } from '@/lang/graphics';
import { Lexer } from '@/lang/lexer';
import { Parser } from '@/lang/parser';
import { Interpreter } from '@/lang/interpreter';
import { Environment } from '@/lang/environment';
import { createBuiltins } from '@/lang/builtins';
import { SdevError } from '@/lang/errors';
import sdevLogo from '@/assets/sdev-logo.png';
import { LaunchAnnouncementCarousel } from '@/components/LaunchAnnouncementCarousel';

const DEFAULT_CODE = `// Welcome to sdev!
// A unique, expressive programming language

forge message be "Hello, World!"
speak(message)

// Try graphics! Click "Turtle" or "Canvas" examples
`;

const FEATURES = [
  {
    icon: Code2,
    title: 'Compiler written in sdev',
    description: 'Lexer, parser and code generator are sdev source. The toolchain rebuilds itself byte-identically on every run — a verified fixed point, not a claim.',
    color: 'text-brand-indigo',
    bg: 'bg-brand-indigo/10',
  },
  {
    icon: Layers,
    title: 'One language, two metals',
    description: 'The same program runs on a hand-written WebAssembly seed VM in the browser and compiles to real x86-64 assembly, linked to a static binary with no libc.',
    color: 'text-brand-violet',
    bg: 'bg-brand-violet/10',
  },
  {
    icon: Cpu,
    title: 'Machine learning, in sdev',
    description: 'Tensors, autograd, transformers, training loops and checkpoints — written in sdev, with FFI, CUDA and WebGPU fast paths underneath.',
    color: 'text-brand-periwinkle',
    bg: 'bg-brand-periwinkle/10',
  },
  {
    icon: Rocket,
    title: 'Programs that rewrite programs',
    description: 'sdev can read, edit and recompile its own source tree — models trained in sdev can propose and land changes to the language itself.',
    color: 'text-brand-rose',
    bg: 'bg-brand-rose/10',
  },
  {
    icon: Globe2,
    title: 'Write in your own language',
    description: 'Keywords exist in 26 human languages — Bulgarian, Japanese, Spanish and more — auto-detected and normalised before a single token is parsed.',
    color: 'text-brand-amber',
    bg: 'bg-brand-amber/10',
  },
  {
    icon: Box,
    title: 'Drawing, maps and hardware',
    description: 'Turtle and 2D canvas, Leaflet mapping primitives, decentralised `summon` packages, and firmware flashed straight onto real boards.',
    color: 'text-brand-green',
    bg: 'bg-brand-green/10',
  },
];

const STATS = [
  { value: '2', label: 'runtimes — WASM & native x86-64' },
  { value: '100%', label: 'self-hosted, byte-identical rebuild' },
  { value: '26', label: 'human keyword languages' },
  { value: '0', label: 'libc dependencies in native builds' },
];


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

  const runCode = useCallback(() => {
    const outputLines: string[] = [];
    const commands: GraphicsCommand[] = [];
    let turtleState: TurtleState = { x: 200, y: 200, angle: -90, penDown: true, color: '#00ff88', width: 2 };

    try {
      const t0 = performance.now();
      // Lexer auto-detects & translates 26+ human languages built-in.
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
      setOutput(outputLines);
      if (e instanceof SdevError) {
        setError(e.message);
      } else {
        setError(String(e));
      }
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
    const url = `${window.location.origin}/?code=${encoded}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  // Restore shared code from ?code= query param on load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const shared = params.get('code');
      if (shared) {
        const decoded = decodeURIComponent(atob(shared));
        setCode(decoded);
      }
    } catch {
      // ignore malformed share links
    }
  }, []);

  const scrollToPlayground = () => {
    playgroundRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background relative">
      <LaunchAnnouncementCarousel />
      <SEO title="sdev — a self-hosted language with a web IDE and native compiler" description="sdev is a programming language whose compiler is written in sdev. Run it on WebAssembly in the browser or compile it to real x86-64 assembly, and build machine learning entirely in the language." path="/" />
      {/* Ambient backdrop */}
      <div className="fixed inset-0 pointer-events-none aurora" />
      <div className="fixed inset-0 pointer-events-none dot-grid opacity-40" />


      {/* ===== NAVIGATION ===== */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3 group">
              <img src={sdevLogo} alt="sdev logo" className="w-9 h-9 object-contain transition-transform group-hover:scale-105" />
              <span className="text-xl font-display font-bold tracking-tight text-foreground">sdev</span>
            </a>
            {/* Nav links */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={scrollToPlayground}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
              >
                Playground
              </button>
              <button
                onClick={() => navigate('/docs')}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
              >
                Docs
              </button>
              <DownloadablesDropdown code={code} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/account')}
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </Button>
            <Button
              onClick={() => navigate('/ide')}
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <MonitorDot className="w-4 h-4" />
              <span className="hidden sm:inline">IDE</span>
            </Button>
            <Button
              onClick={scrollToPlayground}
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <Play className="w-3.5 h-3.5" />
              Try it
            </Button>
          </div>
        </nav>
      </header>

      <main id="main">
      {/* ===== HERO ===== */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-xs text-muted-foreground font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
              v2 “Prism” — out now
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-[4.25rem] font-display font-extrabold tracking-tight leading-[1.05]">
              A language that{' '}
              <span className="gradient-text">builds itself.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              sdev's compiler is written in sdev. It runs on a hand-written WebAssembly VM in your browser,
              compiles to real x86-64 assembly on your machine, and carries a machine-learning stack written
              in the language it trains.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={scrollToPlayground}
                size="lg"
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 px-6"
              >
                <Play className="w-4 h-4" />
                Run sdev now
              </Button>
              <Button
                onClick={() => navigate('/ide')}
                variant="outline"
                size="lg"
                className="gap-2 h-12 px-6 border-border hover:bg-muted/50"
              >
                <MonitorDot className="w-4 h-4" />
                Open IDE
              </Button>
              <Button
                onClick={() => navigate('/docs')}
                variant="ghost"
                size="lg"
                className="gap-2 h-12 px-5 text-muted-foreground hover:text-foreground"
              >
                Docs
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

          </div>

          {/* Right: hero code preview */}
          <div className="relative">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xl shadow-primary/10">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-brand-rose/60" />
                  <div className="w-3 h-3 rounded-full bg-brand-amber/60" />
                  <div className="w-3 h-3 rounded-full bg-brand-green/60" />
                </div>
                <span className="text-xs font-mono text-muted-foreground ml-2">example.sdev</span>
              </div>
              <pre className="p-5 text-sm font-mono leading-7 text-foreground/90 overflow-x-auto">
<span className="text-muted-foreground">// A taste of sdev</span>
{'\n'}<span className="text-brand-periwinkle">conjure</span> <span className="text-brand-amber">greet</span>(name) <span className="text-muted-foreground">::</span>
{'\n'}  <span className="text-brand-periwinkle">yield</span> <span className="text-brand-green">"Hello, "</span> + name + <span className="text-brand-green">"!"</span>
{'\n'}<span className="text-muted-foreground">;;</span>
{'\n'}
{'\n'}<span className="text-brand-periwinkle">forge</span> names <span className="text-brand-cyan">be</span> [<span className="text-brand-green">"Ada"</span>, <span className="text-brand-green">"Alan"</span>, <span className="text-brand-green">"Grace"</span>]
{'\n'}
{'\n'}<span className="text-brand-periwinkle">iterate</span> name <span className="text-brand-periwinkle">through</span> names <span className="text-muted-foreground">::</span>
{'\n'}  <span className="text-brand-amber">speak</span>(<span className="text-brand-amber">greet</span>(name))
{'\n'}<span className="text-muted-foreground">;;</span>
              </pre>
              <div className="px-5 py-3 border-t border-border bg-muted/20">
                <div className="flex items-center gap-2 text-xs font-mono text-brand-green">
                  <span>{'>'}</span> Hello, Ada!
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-brand-green">
                  <span>{'>'}</span> Hello, Alan!
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-brand-green">
                  <span>{'>'}</span> Hello, Grace!
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight">What makes sdev different</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Not another syntax. A toolchain that compiles itself, targets two kinds of machine, and can edit its own source.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-xl border border-border bg-card hover:border-primary/20 hover-lift transition-all"
              >
                <div className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>

          <dl className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card/60 px-5 py-6 text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="block font-display text-3xl font-bold gradient-text">{s.value}</span>
                  <span className="mt-1 block text-xs text-muted-foreground leading-snug">{s.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ===== PLAYGROUND ===== */}
      <section ref={playgroundRef} className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-16">
          {/* Playground header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold tracking-tight">Playground</h2>
              <p className="text-sm text-muted-foreground mt-1">Write, run, and experiment with sdev code in your browser.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </Button>
              <Button
                variant={showTranslator ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowTranslator(!showTranslator)}
                className="gap-1.5 text-xs"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Translate
              </Button>
              <Button
                variant={showCompiler ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowCompiler(!showCompiler)}
                className="gap-1.5 text-xs"
              >
                <Cpu className="w-3.5 h-3.5" />
                Compiler
              </Button>
              <Button
                onClick={runCode}
                size="sm"
                className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                <Play className="w-3.5 h-3.5" />
                Run
                <kbd className="hidden sm:inline ml-1 px-1.5 py-0.5 rounded bg-primary-foreground/20 text-[10px] font-mono">⌘↵</kbd>
              </Button>
            </div>
          </div>

          {/* Examples bar */}
          <div className="mb-4">
            <ExampleCode onSelect={handleExampleSelect} />
          </div>

          {/* Editor + Output grid */}
          <div className="grid lg:grid-cols-5 gap-4">
            {/* Editor */}
            <div className="lg:col-span-3">
              <CodeEditor value={code} onChange={setCode} onRun={runCode} placeholder="// Write your sdev code here..." />
            </div>

            {/* Output panel */}
            <div className="lg:col-span-2 space-y-4">
              {/* Output tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <div className="flex items-center justify-between">
                  <TabsList className="h-9 bg-muted/30">
                    <TabsTrigger value="output" className="text-xs gap-1.5 data-[state=active]:bg-card">
                      <Terminal className="w-3.5 h-3.5" />
                      Output
                    </TabsTrigger>
                    {showCanvas && (
                      <TabsTrigger value="canvas" className="text-xs gap-1.5 data-[state=active]:bg-card">
                        <Palette className="w-3.5 h-3.5" />
                        Canvas
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <div className="flex items-center gap-2">
                    {execTime !== undefined && (
                      <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                        <Timer className="w-3 h-3" />
                        {execTime}ms
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClearOutput}
                      aria-label="Clear output"
                      title="Clear output"
                      className="w-7 h-7 text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <TabsContent value="output" className="mt-2">
                  <OutputPanel lines={output} error={error} />
                </TabsContent>
                <TabsContent value="canvas" className="mt-2">
                  {showCanvas && (
                    <CanvasPanel ref={canvasRef} commands={graphicsCommands} onClose={() => setShowCanvas(false)} />
                  )}
                </TabsContent>
              </Tabs>

              {/* Compiler */}
              {showCompiler && (
                <CompilerPanel
                  code={code}
                  onOutput={(lines, err) => {
                    setOutput(lines);
                    setError(err);
                  }}
                />
              )}

              {/* Translator */}
              {showTranslator && (
                <CodeTranslator onTranslated={handleTranslatedCode} />
              )}
            </div>
          </div>

          {/* Language reference */}
          <div className="mt-8">
            <details className="group">
              <summary className="flex items-center gap-3 cursor-pointer select-none py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <BookOpen className="w-4 h-4" />
                Language Reference
                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="pt-2">
                <LanguageReference />
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* ===== RUNTIMES ===== */}
      <section className="border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">Two runtimes, one language</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              SDEV compiles from a single parser to two backends. Same syntax, same semantics — different metal.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="text-xs font-mono uppercase tracking-wider text-primary mb-2">Web · WASM</div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">Browser IDE</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Runs on WebAssembly — the browser's native assembly. Hand-written WAT seed VM, ~1&nbsp;KB. Zero install, works everywhere.
              </p>
              <code className="block text-xs font-mono text-muted-foreground bg-muted/40 rounded px-3 py-2">Open the IDE → set runtime to WASM</code>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="text-xs font-mono uppercase tracking-wider text-primary mb-2">Desktop · Native ASM</div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">x86-64 CLI</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Emits real x86-64 GAS assembly, links with <code>as</code>+<code>ld</code> to a static ELF. No libc, no runtime. Inspect with <code>objdump -d</code>.
              </p>
              <code className="block text-xs font-mono text-muted-foreground bg-muted/40 rounded px-3 py-2">node scripts/sdev-native.mjs prog.sdev -o prog</code>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ECOSYSTEM ===== */}
      <section className="border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">The whole toolchain</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything around the language — editor, docs, packages and hardware — ships with sdev.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <button onClick={() => navigate('/ide')} className="text-left rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover-lift transition-all">
              <MonitorDot className="w-5 h-5 text-brand-periwinkle mb-3" />
              <h3 className="font-semibold mb-1">Browser IDE</h3>
              <p className="text-sm text-muted-foreground">File tree, terminal, debugger, AI assistant and live preview.</p>
            </button>
            <button onClick={() => navigate('/docs')} className="text-left rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover-lift transition-all">
              <BookOpen className="w-5 h-5 text-brand-violet mb-3" />
              <h3 className="font-semibold mb-1">Documentation</h3>
              <p className="text-sm text-muted-foreground">The sdev Book, Ultimate reference, internals and parity matrices.</p>
            </button>
            <div className="rounded-xl border border-border bg-card p-6">
              <Terminal className="w-5 h-5 text-brand-amber mb-3" />
              <h3 className="font-semibold mb-1">CLI, VS Code & desktop</h3>
              <p className="text-sm text-muted-foreground">npm CLI, a VS Code extension, and a desktop IDE that builds native binaries.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <Box className="w-5 h-5 text-brand-green mb-3" />
              <h3 className="font-semibold mb-1">Packages & hardware</h3>
              <p className="text-sm text-muted-foreground">Decentralized <code className="font-mono text-xs">summon</code> packages and firmware upload to real boards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border bg-card/50">

        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold text-foreground">sdev</span>
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
        <div className="max-w-7xl mx-auto px-6 pb-6 text-center text-xs text-muted-foreground">
          <a href="https://sdev.codes" className="hover:text-foreground transition-colors">SDEV Programming Language</a> © 2026 by <a href="https://web.sdev.codes/" className="hover:text-foreground transition-colors">Sava Milanov</a> is licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="hover:text-foreground transition-colors">Creative Commons Attribution-ShareAlike 4.0 International</a>
          <img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" className="inline-block max-w-[1em] max-h-[1em] ml-[0.2em]" />
          <img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" className="inline-block max-w-[1em] max-h-[1em] ml-[0.2em]" />
          <img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="" className="inline-block max-w-[1em] max-h-[1em] ml-[0.2em]" />
        </div>
      </footer>
      </main>

      {/* AI Chatbot */}
      <SdevChatbot onInsertCode={(code) => {
        setCode(code);
        setOutput([]);
        setError(undefined);
        setGraphicsCommands([]);
      }} />
    </div>
  );
};

export default Index;
