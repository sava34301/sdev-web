import { Lexer, LexerOptions } from './lexer';
import { Parser } from './parser';
import { Interpreter } from './interpreter';
import { SdevError } from './errors';
import { stripBoardBlocks } from './hardware/strip';

export interface ExecutionResult {
  success: boolean;
  output: string[];
  error?: string;
  /** Language detected/used by the built-in translator, if any. */
  detectedLanguage?: string | null;
}

export interface ExecuteOptions extends LexerOptions {}

function pickRuntime(source: string): 'v1' | 'v2' {
  // Scan the first ~10 lines for a #!sdev shebang. IDE may prepend a
  // `// filename` header, so we can't require line 1.
  const head = source.split('\n', 10);
  for (const raw of head) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#!sdev v2')) return 'v2';
    if (line.startsWith('#!sdev v1')) return 'v1';
  }
  if (typeof localStorage !== 'undefined') {
    const pref = localStorage.getItem('sdev_runtime');
    if (pref === 'v2' || pref === 'v2-wasm') return 'v2';
    if (pref === 'v1') return 'v1';
  }
  return 'v1';
}

/**
 * Run sdev v2 source. v2 has ONE implementation: the sdev-written compiler
 * (lang/compiler/*.sdev) executing on the seed VM. No JavaScript interpreter.
 */
export async function executeV2(source: string): Promise<ExecutionResult> {
  const { runWasm, WasmSubsetError } = await import('@/lang-bridge/wasm-runtime');
  try {
    const r = await runWasm(source);
    return { success: r.success, output: r.output, error: r.error ?? undefined, detectedLanguage: null };
  } catch (e) {
    const notYet = e instanceof WasmSubsetError;
    return {
      success: false,
      output: [],
      error: notYet
        ? `the self-hosted sdev compiler cannot compile this yet: ${(e as Error).message}`
        : e instanceof Error ? e.message : String(e),
      detectedLanguage: null,
    };
  }
}

/** Async entry point: v2 goes to the self-hosted toolchain, v1 to the interpreter. */
export async function executeAsync(source: string, options: ExecuteOptions = {}): Promise<ExecutionResult> {
  if (pickRuntime(source) === 'v2') return executeV2(source);
  return execute(source, options);
}

export function execute(source: string, options: ExecuteOptions = {}): ExecutionResult {
  const output: string[] = [];

  if (pickRuntime(source) === 'v2') {
    return {
      success: false,
      output,
      error: 'sdev v2 runs only on the self-hosted compiler (async). Use executeAsync().',
      detectedLanguage: null,
    };
  }



  try {
    const cleaned = stripBoardBlocks(source);
    const lexer = new Lexer(cleaned, options);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const interpreter = new Interpreter((msg) => output.push(msg));
    interpreter.interpret(ast);

    return { success: true, output, detectedLanguage: lexer.detectedLanguage };
  } catch (e) {
    if (e instanceof SdevError) {
      return { success: false, output, error: e.message };
    }
    if (e instanceof Error) {
      return { success: false, output, error: e.message };
    }
    return { success: false, output, error: String(e) };
  }
}

export { Lexer } from './lexer';
export { Parser } from './parser';
export { Interpreter } from './interpreter';
export { SdevError } from './errors';
export {
  translateSource,
  detectLanguage,
  hasNonAscii,
  SUPPORTED_LANGUAGES,
  KEYWORD_TABLES,
} from './translator';
export { resolveLinks } from './linker';
export type { LinkableFile } from './linker';
export * from './tokens';
export * from './ast';
