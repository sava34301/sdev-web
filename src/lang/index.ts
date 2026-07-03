import { Lexer, LexerOptions } from './lexer';
import { Parser } from './parser';
import { Interpreter } from './interpreter';
import { SdevError } from './errors';
import { stripBoardBlocks } from './hardware/strip';
// v2 runtime — pure JavaScript, zero TypeScript. See lang/README.md.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain JS module, ambient types in src/lang-bridge/v2.d.ts
import { run as runV2 } from '../../lang/runtime/v2.js';

export interface ExecutionResult {
  success: boolean;
  output: string[];
  error?: string;
  /** Language detected/used by the built-in translator, if any. */
  detectedLanguage?: string | null;
}

export interface ExecuteOptions extends LexerOptions {}

function pickRuntime(source: string): 'v1' | 'v2' {
  const firstLine = source.slice(0, 80).split('\n', 1)[0].trim();
  if (firstLine.startsWith('#!sdev v2')) return 'v2';
  if (firstLine.startsWith('#!sdev v1')) return 'v1';
  if (typeof localStorage !== 'undefined') {
    const pref = localStorage.getItem('sdev_runtime');
    if (pref === 'v2' || pref === 'v1') return pref;
  }
  return 'v1';
}

export function execute(source: string, options: ExecuteOptions = {}): ExecutionResult {
  const output: string[] = [];

  if (pickRuntime(source) === 'v2') {
    const result = runV2(source, { onOutput: (line: string) => output.push(line) });
    return {
      success: result.success,
      output: result.output.length ? result.output : output,
      error: result.error ?? undefined,
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
