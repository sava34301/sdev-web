/**
 * The CLI execution pipeline — identical in behaviour to the web IDE.
 *
 *   source file
 *     -> strip the hidden signature line
 *     -> canonicalize through the active dialect (words, operators, style)
 *     -> apply enabled extensions (prelude + operator desugaring)
 *     -> resolve `use "@user/lib"` libraries into a module map
 *     -> run on v1 (interpreter) or v2 (self-hosted compiler + seed VM)
 */
import './env';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import { Lexer } from '@/lang/lexer';
import { Parser } from '@/lang/parser';
import { Interpreter } from '@/lang/interpreter';
import { stripBoardBlocks } from '@/lang/hardware/strip';
import { canonicalize } from '@/lang/dialect/canonicalize';
import { applyExtensions } from '@/lang/dialect/extensions';
import { resolveLibraries } from '@/lang/dialect/registry';
import { readSignature, stripSignature, type FileSignature } from '@/lang/dialect/signature';
import type { DialectSpec } from '@/lang/dialect/spec';
import { understand, understandAsync, type AgentMode, type BrainMode, type UnderstandResult } from '@/lang/agent';
import { activeDialect, findDialect, runtimePreference } from './store';

export interface PrepareOptions {
  /** dialect slug, or "none" to force canonical sdev */
  dialect?: string;
  /** skip enabled extensions */
  noExt?: boolean;
  /** source natural language for the built-in translator */
  lang?: string;
  /** force a runtime */
  runtime?: 'v1' | 'v2';
  /** understanding agent: off | auto | on | strict */
  agent?: AgentMode;
  /** where the agent's AI brain runs */
  brain?: BrainMode;
  /** print what the agent understood */
  explain?: boolean;
}

export interface Prepared {
  /** canonical sdev, ready to run */
  code: string;
  signature: FileSignature | null;
  dialect: DialectSpec | null;
  runtime: 'v1' | 'v2';
}

function shebangRuntime(source: string): 'v1' | 'v2' | null {
  for (const raw of source.split('\n', 10)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#!sdev v2')) return 'v2';
    if (line.startsWith('#!sdev v1')) return 'v1';
  }
  return null;
}

export function resolveDialect(sig: FileSignature | null, opt?: string): DialectSpec | null {
  if (opt === 'none') return null;
  if (opt) {
    const found = findDialect(opt);
    if (!found) throw new Error(`No local dialect "${opt}". Run: sdev dialect list`);
    return found;
  }
  if (sig?.dialect) {
    const fromSig = findDialect(sig.dialect.replace(/^@[^/]+\//, ''));
    if (fromSig) return fromSig;
  }
  return activeDialect();
}

export function prepare(rawSource: string, opts: PrepareOptions = {}): Prepared {
  const signature = readSignature(rawSource);
  const body = stripSignature(rawSource);
  const dialect = resolveDialect(signature, opts.dialect);

  let code = dialect ? canonicalize(body, dialect).source : body;
  if (!opts.noExt) code = applyExtensions(code);

  const runtime = opts.runtime ?? shebangRuntime(body) ?? (signature?.rt === 'v2' ? 'v2' : null) ?? runtimePreference();
  return { code, signature, dialect, runtime };
}

/** Local `use "path"` modules, read relative to the file then the CWD. */
export function localModules(entryPath: string, source: string): Record<string, string> {
  const modules: Record<string, string> = {};
  const dir = dirname(resolve(entryPath));
  const seen = new Set<string>();

  const walk = (src: string) => {
    const re = /\buse\s+"([^"@][^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const spec = m[1];
      if (seen.has(spec)) continue;
      seen.add(spec);
      const candidates = isAbsolute(spec) ? [spec] : [resolve(dir, spec), resolve(process.cwd(), spec)];
      const hit = candidates.find((c) => existsSync(c));
      if (!hit) continue;
      const text = stripSignature(readFileSync(hit, 'utf8'));
      modules[spec] = text;
      walk(text);
    }
  };
  walk(source);
  return modules;
}

export interface RunOutcome {
  success: boolean;
  error?: string;
}

/** Run prepared code, streaming output to stdout as it is produced. */
export async function runPrepared(
  prepared: Prepared,
  entryPath: string | null,
  opts: PrepareOptions = {},
): Promise<RunOutcome> {
  const say = (line: string) => process.stdout.write(line + '\n');

  if (prepared.runtime === 'v2') {
    const { runWasm, WasmSubsetError } = await import('@/lang-bridge/wasm-runtime');
    const modules = {
      ...(entryPath ? localModules(entryPath, prepared.code) : {}),
      ...(await resolveLibraries(prepared.code)),
    };
    try {
      const r = await runWasm(prepared.code, modules, {
        sourceLanguage: opts.lang ?? 'auto',
        dialect: prepared.dialect,
      });
      for (const line of r.output) say(line);
      return { success: r.success, error: r.error ?? undefined };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        success: false,
        error: e instanceof WasmSubsetError ? `the self-hosted sdev compiler cannot compile this yet: ${msg}` : msg,
      };
    }
  }

  try {
    const lexer = new Lexer(stripBoardBlocks(prepared.code), {
      sourceLanguage: opts.lang ?? 'auto',
      dialect: prepared.dialect,
    });
    const ast = new Parser(lexer.tokenize()).parse();
    new Interpreter(say).interpret(ast);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function readSource(file: string): string {
  const p = resolve(process.cwd(), file);
  if (!existsSync(p)) throw new Error(`File not found: ${p}`);
  return readFileSync(p, 'utf8');
}
