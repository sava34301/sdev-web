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
import type { WebState } from '@/lang/web';
import { stripBoardBlocks } from '@/lang/hardware/strip';
import { resolveLinks, type LinkableFile } from '@/lang/linker';
import { canonicalize } from '@/lang/dialect/canonicalize';
import { applyExtensions } from '@/lang/dialect/extensions';
import { resolveLibraries } from '@/lang/dialect/registry';
import { readSignature, stripSignature, type FileSignature } from '@/lang/dialect/signature';
import { extractDialectDirective, isDialectSdevFile, parseDialectFromSdev } from '@/lang/dialect/sdev-format';
import type { DialectSpec } from '@/lang/dialect/spec';
import { senseFile, understand, understandAsync, wordsNeedReading, type AgentMode, type BrainMode, type UnderstandResult } from '@/lang/agent';
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
  /** what the understanding agent made of the file */
  agent: UnderstandResult | null;
}

/** Print, once, what the agent changed. */
export function explainAgent(result: UnderstandResult | null): void {
  if (!result || !result.notes.length) return;
  process.stdout.write(`agent (${result.mode}${result.brainUsed !== 'none' ? `, ${result.brainUsed} AI` : ''}) understood:\n`);
  for (const n of result.notes) process.stdout.write(`  ${n.line}: ${n.from}  ->  ${n.to}\n`);
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

function loadDialectFile(ref: string): DialectSpec | null {
  const candidates = isAbsolute(ref) ? [ref] : [resolve(process.cwd(), ref)];
  const hit = candidates.find((p) => existsSync(p));
  if (!hit) return null;
  const src = stripSignature(readFileSync(hit, 'utf8'));
  if (!isDialectSdevFile(src)) {
    throw new Error(`"${ref}" is not a valid .sdev dialect file (expected "to dialect_meta" or "to dialect_words").`);
  }
  return parseDialectFromSdev(src);
}

export function resolveDialect(sig: FileSignature | null, opt?: string): DialectSpec | null {
  if (opt === 'none') return null;
  if (opt) {
    if (opt.endsWith('.sdev') || existsSync(resolve(process.cwd(), opt))) {
      const fromFile = loadDialectFile(opt);
      if (fromFile) return fromFile;
    }
    const found = findDialect(opt);
    if (!found) throw new Error(`No local dialect or .sdev dialect file "${opt}". Run: sdev dialect list`);
    return found;
  }
  if (sig?.dialect) {
    const fromSig = findDialect(sig.dialect.replace(/^@[^/]+\//, ''));
    if (fromSig) return fromSig;
  }
  return activeDialect();
}

function shouldSkipUnderstander(
  code: string,
  dialect: DialectSpec | null,
  runtime: 'v1' | 'v2',
  agentMode?: AgentMode,
): boolean {
  if (agentMode === 'off') return true;
  if (agentMode === 'on') return false;
  // Dialects translate deterministically straight into canonical sdev v2 without the AI understander.
  if (dialect) return true;
  if (runtime === 'v2' && !wordsNeedReading(code)) return true;
  const quick = senseFile(code);
  return !quick.suspicious && quick.parses;
}

export function prepare(rawSource: string, opts: PrepareOptions = {}): Prepared {
  const signature = readSignature(rawSource);
  let body = stripBoardBlocks(stripSignature(rawSource));
  const directive = extractDialectDirective(body);
  if (directive) body = directive.stripped;
  const dialect = resolveDialect(signature, opts.dialect ?? directive?.target);

  let code = dialect ? canonicalize(body, dialect).source : body;
  const runtime =
    opts.runtime ??
    shebangRuntime(body) ??
    (signature?.rt === 'v2' ? 'v2' : null) ??
    (dialect ? 'v2' : null) ??
    runtimePreference();

  let agent: UnderstandResult | null = null;
  if (!shouldSkipUnderstander(code, dialect, runtime, opts.agent)) {
    agent = understand(code, { mode: opts.agent, brain: opts.brain, dialect });
    code = agent.source;
  }

  if (!opts.noExt) code = applyExtensions(code);

  return { code, signature, dialect, runtime, agent };
}

/** Same as `prepare`, but the agent may also consult its AI brain when needed. */
export async function prepareAsync(rawSource: string, opts: PrepareOptions = {}): Promise<Prepared> {
  const signature = readSignature(rawSource);
  let body = stripBoardBlocks(stripSignature(rawSource));
  const directive = extractDialectDirective(body);
  if (directive) body = directive.stripped;
  const dialect = resolveDialect(signature, opts.dialect ?? directive?.target);

  let code = dialect ? canonicalize(body, dialect).source : body;
  const runtime =
    opts.runtime ??
    shebangRuntime(body) ??
    (signature?.rt === 'v2' ? 'v2' : null) ??
    (dialect ? 'v2' : null) ??
    runtimePreference();

  let agent: UnderstandResult | null = null;
  if (!shouldSkipUnderstander(code, dialect, runtime, opts.agent)) {
    agent = await understandAsync(code, { mode: opts.agent, brain: opts.brain, dialect });
    code = agent.source;
  }

  if (!opts.noExt) code = applyExtensions(code);

  return { code, signature, dialect, runtime, agent };
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

/** Local `link "path"` files, read relative to the file then the CWD. */
export function localLinkFiles(entryPath: string | null, source: string): LinkableFile[] {
  const files: LinkableFile[] = [];
  const dir = entryPath ? dirname(resolve(entryPath)) : process.cwd();
  const seen = new Set<string>();

  const walk = (src: string) => {
    const re = /^[ \t]*link\b[^\n"']*["']([^"'\n]+)["'](?:\s+as\s+[A-Za-z_][A-Za-z0-9_]*)?[ \t]*;?[ \t]*$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const spec = m[1];
      if (seen.has(spec)) continue;
      seen.add(spec);
      const candidates = isAbsolute(spec) ? [spec] : [resolve(dir, spec), resolve(process.cwd(), spec)];
      const hit = candidates.find((c) => existsSync(c));
      if (!hit) continue;
      const content = stripSignature(readFileSync(hit, 'utf8'));
      files.push({ name: spec, content });
      walk(content);
    }
  };
  walk(source);
  return files;
}

export interface RunOutcome {
  success: boolean;
  error?: string;
  webState?: WebState | null;
  webHtml?: string | null;
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
    const linked = resolveLinks(prepared.code, localLinkFiles(entryPath, prepared.code), {
      entryName: entryPath ?? '<entry>',
    });
    const lexer = new Lexer(stripBoardBlocks(linked), {
      sourceLanguage: opts.lang ?? 'auto',
      dialect: prepared.dialect,
    });
    const ast = new Parser(lexer.tokenize()).parse();
    const interpreter = new Interpreter(say);
    interpreter.interpret(ast);
    return {
      success: true,
      webState: interpreter.getWebState(),
      webHtml: interpreter.getWebHtml(),
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function readSource(file: string): string {
  const p = resolve(process.cwd(), file);
  if (!existsSync(p)) throw new Error(`File not found: ${p}`);
  return readFileSync(p, 'utf8');
}
