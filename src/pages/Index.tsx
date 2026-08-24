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
  Recycle, Globe2, Layers, UserCircle, Binary,
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

  const scrollToPlayground = () => playgroundRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-background relative">
      <SEO
        title="sdev — Self-Hosted Language, WebAssembly + Native"
        description="sdev is a self-hosted programming language with a browser IDE, WebAssembly runtime, native x86-64 compiler, and built-in machine learning stack."
        path="/"
      />
      <div className="fixed inset-0 pointer-events-none aurora" />

      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <nav className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <a href="/" className="flex items-center gap-2.5 group">
              <img src={sdevLogo} alt="sdev" className="w-7 h-7 object-contain" />
              <span className="text-lg font-display tracking-tight text-foreground">sdev</span>
              <span className="rule-label border border-border rounded px-1.5 py-0.5 leading-none">v2</span>
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
            <Button onClick={() => navigate('/ide')} size="sm" className="gap-2 font-medium">
              <MonitorDot className="w-3.5 h-3.5" />
              Open IDE
            </Button>
          </div>
        </nav>
      </header>

      <main id="main">
        {/* ===== HERO ===== */}
        <section className="relative max-w-[1400px] mx-auto px-6 pt-16 pb-10 md:pt-24 md:pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div className="max-w-2xl">
              <div className="rule-label mb-5">A self-hosting language · released 2026</div>
              <h1 className="font-display text-[2.75rem] leading-[0.95] sm:text-6xl lg:text-[5rem] tracking-[-0.04em]">
                This is<br />
                <span className="gradient-text">SDEV.</span>
              </h1>
              <p className="mt-7 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Lexer, parser and code generator are sdev source files. The toolchain rebuilds itself
                and the output is byte-for-byte identical every time — a fixed point you can verify,
                not a claim you have to trust.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button onClick={scrollToPlayground} size="lg" className="gap-2 h-12 px-6 font-semibold">
                  <Play className="w-4 h-4" /> Run it in the browser
                </Button>
                <Button onClick={() => navigate('/docs')} variant="outline" size="lg" className="gap-2 h-12 px-6">
                  Read the docs <ArrowRight className="w-4 h-4" />
                </Button>
                <code className="hidden lg:inline-flex items-center h-12 px-4 rounded-md border border-border bg-card/60 font-mono text-sm text-muted-foreground">
                  <span className="text-primary mr-2">$</span> npm i -g sdev-lang
                </code>
              </div>
            </div>

            {/* Code specimen */}
            <div className="bento p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/70 bg-background/40">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-rose/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-amber/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-green/60" />
                </div>
                <span className="text-xs font-mono text-muted-foreground ml-2">example.sdev</span>
              </div>
              <pre className="p-5 text-sm font-mono leading-7 text-foreground/90 overflow-x-auto">
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
            </div>
          </div>
        </section>


        {/* ===== BENTO ===== */}
        <section className="max-w-[1400px] mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-6 auto-rows-[minmax(0,auto)] gap-4">

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
                <p className="text-sm text-muted-foreground">Files, terminal, debugger, AI assistant, live preview.</p>
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

        {/* ===== PLAYGROUND ===== */}
        <section ref={playgroundRef} className="border-t border-border bg-card/20">
          <div className="max-w-[1400px] mx-auto px-6 py-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                <div className="rule-label mb-2">Live</div>
                <h2 className="text-3xl">Playground</h2>
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

            <div className="grid lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3">
                <CodeEditor value={code} onChange={setCode} onRun={runCode} placeholder="// Write your sdev code here..." />
              </div>

              <div className="lg:col-span-2 space-y-4">
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
                  <TabsContent value="output" className="mt-2">
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

        {/* ===== CTA ===== */}
        <section className="border-t border-border">
          <div className="max-w-[1400px] mx-auto px-6 py-20 text-center">
            <h2 className="text-3xl md:text-5xl tracking-tight">Start where you are.</h2>
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
