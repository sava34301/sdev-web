import { Lexer } from '@/lang/core/lexer';
import { Parser } from '@/lang/core/parser';
import { Interpreter } from '@/lang/runtime/interpreter';
import { Compiler } from '@/lang/runtime/compiler';
import { disassemble } from '@/lang/runtime/bytecode';
import { SdevError } from '@/lang/core/errors';
import { createGraphicsBuiltins, type GraphicsCommand, type TurtleState } from '@/lang/stdlib/graphics';
import { createWebBuiltins, bindWebBuiltinsToEnv, type WebState } from '@/lang/stdlib/web';

export interface RunResult {
  lines: string[];
  error?: string;
  ms: number;
  commands: GraphicsCommand[];
  web?: WebState | null;
}

export interface BytecodeResult {
  disasm: string;
  error?: string;
}

/** Runs sdev source with the real in-repo lexer → parser → interpreter (keywords in any supported language), incl. canvas/turtle & web DSL. */
export function runSdev(code: string): RunResult {
  const lines: string[] = [];
  const commands: GraphicsCommand[] = [];
  let turtle: TurtleState = { x: 200, y: 200, angle: -90, penDown: true, color: '#0A7150', width: 2 };
  const t0 = performance.now();
  let web: WebState | null = null;
  try {
    const ast = new Parser(new Lexer(code, { sourceLanguage: 'auto' }).tokenize()).parse();
    const it = new Interpreter((msg) => lines.push(msg));
    const env = it.getGlobalEnv();
    createGraphicsBuiltins((c) => commands.push(c), () => turtle, (s) => { turtle = { ...turtle, ...s }; }).forEach((fn, name) => env.define(name, fn));
    bindWebBuiltinsToEnv(env, createWebBuiltins((s) => {
      web = { ...s, head: [...s.head], stack: s.stack.map((b) => [...b]), css: [...s.css], js: [...s.js], moduleJs: [...(s.moduleJs ?? [])] };
    }));
    it.interpret(ast);
    return { lines, commands, web, ms: performance.now() - t0 };
  } catch (e) {
    return { lines, commands, web, error: e instanceof SdevError ? e.message : String(e), ms: performance.now() - t0 };
  }
}

/** Compiles sdev source to stack-VM bytecode and returns readable disassembly. */
export function compileSdevBytecode(code: string): BytecodeResult {
  try {
    const ast = new Parser(new Lexer(code, { sourceLanguage: 'auto' }).tokenize()).parse();
    const chunk = new Compiler().compile(ast);
    return { disasm: disassemble(chunk) };
  } catch (e) {
    return { disasm: '', error: e instanceof SdevError ? e.message : String(e) };
  }
}

export function openInIde(src: string, name: string, navigate: (to: string) => void) {
  sessionStorage.setItem('sdev:imported_code', src);
  sessionStorage.setItem('sdev:imported_name', name);
  navigate('/ide');
}

export const HOME_EXAMPLES = [
  {
    id: 'hello',
    name: 'hello.sdev',
    code: `forge name be "Ada"\nspeak("Hello, " + name + "!")\n\nforge total be 12 * 4\nspeak("12 × 4 = " + total)`,
  },
  {
    id: 'functions',
    name: 'functions.sdev',
    code: `conjure fib(n) ::\n  ponder n <= 1 :: yield n ;;\n  yield fib(n - 1) + fib(n - 2)\n;;\n\niterate i through [0, 1, 2, 3, 5, 8, 10] ::\n  speak("fib(" + i + ") = " + fib(i))\n;;`,
  },
  {
    id: 'pipe',
    name: 'pipe.sdev',
    code: `forge scores be [42, 88, 95, 67, 100, 73]\n\nforge curved be scores\n  |> sift(x -> x >= 70)\n  |> each(x -> "★ " + x)\n  |> weave(" · ")\n\nspeak(curved)`,
  },
  {
    id: 'essence',
    name: 'person.sdev',
    code: `essence Compiler ::\n  conjure init(self, name, target) ::\n    self.name be name\n    self.target be target\n  ;;\n\n  conjure describe(self) ::\n    speak(self.name + " → " + self.target)\n  ;;\n;;\n\nforge wasm be new Compiler("sdev-seed", "WebAssembly")\nforge x64 be new Compiler("sdev-native", "x86-64 ELF/PE")\nwasm.describe()\nx64.describe()`,
  },
  {
    id: 'canvas',
    name: 'canvas.sdev',
    code: `canvas(360, 260)\nclear("#0e100f")\n\nforge i be 0\ncycle i < 24 ::\n  forge angle be (i / 24) * 2 * PI\n  forge x be 180 + cos(angle) * 76\n  forge y be 130 + sin(angle) * 76\n  stroke("#c8ff2e", 1.5)\n  circle(x, y, 36)\n  i be i + 1\n;;\n\nfill("#3ddc97")\ncircle(180, 130, 8)`,
  },
  {
    id: 'webpage',
    name: 'web.sdev',
    code: `page("Built in sdev")\nstyle("body { font-family: system-ui, sans-serif; background: #f6f4ef; color: #13161b; padding: 28px; margin: 0 } .badge { display: inline-block; background: #c8ff2e; color: #13161b; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase } h1 { font-size: 32px; letter-spacing: -0.03em; margin: 14px 0 8px } p { color: #525860; line-height: 1.6; margin: 0 }")\nraw("<span class='badge'>Live HTML DSL</span>")\ntag("h1", "Web pages as plain sdev.")\ntag("p", "Every tag, style rule and interaction compiles right in your browser.")\nendpage()`,
  },
];
