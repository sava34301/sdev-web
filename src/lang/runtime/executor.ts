import { Lexer, LexerOptions } from '../core/lexer';
import { Parser } from '../core/parser';
import { Interpreter } from './interpreter';
import type { WebState } from '../stdlib/web';
import { stripBoardBlocks } from '../hardware/strip';
import { understand, understandAsync, stripAgentDirectives, reconsider, asWritten, parses, wordsNeedReading } from '../agent';
import type { UnderstandOptions, UnderstandResult } from '../agent';

export interface ExecutionResult {
  success: boolean;
  output: string[];
  error?: string;
  /** Language detected/used by the built-in translator, if any. */
  detectedLanguage?: string | null;
  /** Captured WebState when the program calls Web Toolkit functions (`page(...)`, etc.). */
  webState?: WebState | null;
  /** Rendered HTML document when the program produced a web page. */
  webHtml?: string | null;
}

export interface ExecuteOptions extends LexerOptions {
  /**
   * The understanding agent. Omit for the default (rules + memory, AI when
   * the file still doesn't make sense), pass options to steer it, or `false`
   * to run the source exactly as written.
   */
  agent?: UnderstandOptions | false;
}

export function pickRuntime(source: string): 'v1' | 'v2' {
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
export async function executeV2(source: string, options: ExecuteOptions = {}): Promise<ExecutionResult> {
  const { runWasm, WasmSubsetError } = await import('@/lang-bridge/wasm-runtime');
  try {
    const written = asWritten(source);
    let r: Awaited<ReturnType<typeof runWasm>>;
    if (options.agent !== false && wordsNeedReading(written)) {
      const understood = await understandFor(source, options, true);
      try {
        r = await runWasm(understood);
        return { success: r.success, output: r.output, error: r.error ?? undefined, detectedLanguage: null };
      } catch {
        // the reading does not compile — try the file as written
      }
    }
    try {
      r = await runWasm(written);
    } catch (first) {
      if (!(first instanceof WasmSubsetError) || options.agent === false) throw first;
      const understood = await understandFor(source, options, true);
      if (understood.trim() === written.trim()) throw first;
      try { r = await runWasm(understood); } catch { throw first; }
    }
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

/** What the agent did on the most recent run — the IDE shows this. */
export let lastAgentRun: UnderstandResult | null = null;

export function setLastAgentRun(result: UnderstandResult | null): void {
  lastAgentRun = result;
}

/**
 * Run the understanding agent in front of the compiler. `!#agent:off` in the
 * file, or `agent: false` here, skips it entirely.
 */
async function understandFor(source: string, options: ExecuteOptions, allowAI: boolean): Promise<string> {
  if (options.agent === false) return stripAgentDirectives(source);
  const opts = { dialect: options.dialect ?? null, ...(options.agent ?? {}) };
  const result = allowAI ? await understandAsync(source, opts) : understand(source, opts);
  lastAgentRun = result;
  return result.source;
}

/** Async entry point: v2 goes to the self-hosted toolchain, v1 to the interpreter. */
export async function executeAsync(source: string, options: ExecuteOptions = {}): Promise<ExecutionResult> {
  if (pickRuntime(source) === 'v2') return executeV2(source, options);
  const understood = await understandFor(source, options, true);
  const first = execute(understood, { ...options, agent: false });
  if (first.success || options.agent === false || !first.error) return first;
  const written = asWritten(source);
  if (understood.trim() !== written.trim() && parses(written)) return execute(written, { ...options, agent: false });
  if (understood.trim() === written.trim() && parses(written)) return first;
  const retry = await reconsider(source, first.error, { dialect: options.dialect ?? null, ...(options.agent || {}) }).catch(() => null);
  if (!retry) return first;
  const second = execute(retry.source, { ...options, agent: false });
  if (second.success) { lastAgentRun = retry; return second; }
  return first;
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

  const plain = stripAgentDirectives(source);
  const agentOpts = options.agent === false ? null : { dialect: options.dialect ?? null, ...(options.agent ?? {}) };
  let understood = plain;
  if (agentOpts) {
    const result = understand(source, agentOpts);
    lastAgentRun = result;
    understood = result.source;
  }

  const attempt = (src: string): ExecutionResult => {
    const lineOutput: string[] = [];
    try {
      const cleaned = stripBoardBlocks(src);
      const lexer = new Lexer(cleaned, options);
      const tokens = lexer.tokenize();

      const parser = new Parser(tokens);
      const ast = parser.parse();

      const interpreter = new Interpreter((msg) => lineOutput.push(msg));
      interpreter.interpret(ast);

      return {
        success: true,
        output: lineOutput,
        detectedLanguage: lexer.detectedLanguage,
        webState: interpreter.getWebState(),
        webHtml: interpreter.getWebHtml(),
      };
    } catch (e) {
      if (e instanceof Error) return { success: false, output: lineOutput, error: e.message };
      return { success: false, output: lineOutput, error: String(e) };
    }
  };

  const first = attempt(understood);
  if (first.success || understood === plain) return first;
  const writtenAttempt = attempt(plain);
  return writtenAttempt.success ? writtenAttempt : first;
}
