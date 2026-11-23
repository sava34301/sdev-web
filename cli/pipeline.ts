/**
 * The CLI execution pipeline — mirrors the web IDE pipeline:
 *   strip signature -> resolve `#!dialect` / active dialect -> apply extensions
 *   -> resolve `use` libraries -> execute on v1 or v2 (WASM seed VM).
 */
import './env';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import { Lexer } from '@/lang/core/lexer';
import { Parser } from '@/lang/core/parser';
import { Interpreter } from '@/lang/runtime/interpreter';
import type { WebState } from '@/lang/stdlib/web';
import { stripBoardBlocks } from '@/lang/hardware/strip';
import { resolveLinks, type LinkableFile } from '@/lang/tools/linker';
import { applyExtensions } from '@/lang/dialect/extensions';
import { resolveLibraries } from '@/lang/dialect/registry';
import { resolveDialectSource } from '@/lang/dialect/resolve';
import { extractDialectDirective, isDialectSdevFile, parseDialectFromSdev } from '@/lang/dialect/sdev-format';
import { readSignature, stripSignature, type FileSignature } from '@/lang/dialect/signature';
import type { DialectSpec } from '@/lang/dialect/spec';
import { senseFile, understand, understandAsync, wordsNeedReading, type AgentMode, type BrainMode, type UnderstandResult } from '@/lang/agent';
import { activeDialect, findDialect, runtimePreference } from './store';

export interface PrepareOptions {
  dialect?: string;
  noExt?: boolean;
  lang?: string;
  runtime?: 'v1' | 'v2';
  agent?: AgentMode;
  brain?: BrainMode;
  explain?: boolean;
}

export interface Prepared {
  code: string;
  signature: FileSignature | null;
  dialect: DialectSpec | null;
  runtime: 'v1' | 'v2';
  agent: UnderstandResult | null;
}

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
  const p = isAbsolute(ref) ? ref : resolve(process.cwd(), ref);
  if (!existsSync(p)) return null;
  const src = stripSignature(readFileSync(p, 'utf8'));
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
  if (dialect) return true;
  if (runtime === 'v2' && !wordsNeedReading(code)) return true;
  const quick = senseFile(code);
  return !quick.suspicious && quick.parses;
}

function prepareStage(rawSource: string, opts: PrepareOptions) {
  const signature = readSignature(rawSource);
  const body = stripBoardBlocks(stripSignature(rawSource));
  const fallbackDialect = resolveDialect(signature, opts.dialect);

  let code: string;
  let dialect: DialectSpec | null;

  if (opts.dialect) {
    // Explicit `--dialect` flag overrides `#!dialect` file directives.
    const directive = extractDialectDirective(body);
    const cleaned = directive ? directive.stripped : body;
    const resolved = opts.dialect === 'none'
      ? { source: cleaned, dialect: null }
      : resolveDialectSource(cleaned, fallbackDialect, [], findDialect);
    code = resolved.source;
    dialect = resolved.dialect;
  } else {
    const directive = extractDialectDirective(body);
    const directiveFiles: Array<{ name: string; content: string }> = [];
    if (directive) {
      const candidate = isAbsolute(directive.target) ? directive.target : resolve(process.cwd(), directive.target);
      if (existsSync(candidate)) {
        directiveFiles.push({ name: directive.target, content: stripSignature(readFileSync(candidate, 'utf8')) });
      }
    }
    const resolved = resolveDialectSource(body, fallbackDialect, directiveFiles, (target) => findDialect(target));
    code = resolved.source;
    dialect = resolved.dialect;
  }

  const runtime =
    opts.runtime ??
    shebangRuntime(body) ??
    (signature?.rt === 'v2' ? 'v2' : null) ??
    (dialect ? 'v2' : null) ??
    runtimePreference();

  const needsUnderstand = !shouldSkipUnderstander(code, dialect, runtime, opts.agent);
  return { signature, dialect, runtime, code, needsUnderstand };
}

function finishPrepare(
  stage: ReturnType<typeof prepareStage>,
  opts: PrepareOptions,
  agent: UnderstandResult | null,
): Prepared {
  let code = agent ? agent.source : stage.code;
  if (!opts.noExt) code = applyExtensions(code);
  return { code, signature: stage.signature, dialect: stage.dialect, runtime: stage.runtime, agent };
}

export function prepare(rawSource: string, opts: PrepareOptions = {}): Prepared {
  const stage = prepareStage(rawSource, opts);
  const agent = stage.needsUnderstand
    ? understand(stage.code, { mode: opts.agent, brain: opts.brain, dialect: stage.dialect })
    : null;
  return finishPrepare(stage, opts, agent);
}

/** Same as `prepare`, but may also consult the configured AI brain when needed. */
export async function prepareAsync(rawSource: string, opts: PrepareOptions = {}): Promise<Prepared> {
  const stage = prepareStage(rawSource, opts);
  const agent = stage.needsUnderstand
    ? await understandAsync(stage.code, { mode: opts.agent, brain: opts.brain, dialect: stage.dialect })
    : null;
  return finishPrepare(stage, opts, agent);
}

function collectReferencedPaths(
  entryPath: string | null,
  source: string,
  pattern: RegExp,
): Array<{ spec: string; content: string }> {
  const out: Array<{ spec: string; content: string }> = [];
  const dir = entryPath ? dirname(resolve(entryPath)) : process.cwd();
  const seen = new Set<string>();

  const walk = (src: string) => {
    const re = new RegExp(pattern.source, pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const spec = m[1];
      if (seen.has(spec)) continue;
      seen.add(spec);
      const candidates = isAbsolute(spec) ? [spec] : [resolve(dir, spec), resolve(process.cwd(), spec)];
      const hit = candidates.find((c) => existsSync(c));
      if (!hit) continue;
      const content = stripSignature(readFileSync(hit, 'utf8'));
      out.push({ spec, content });
      walk(content);
    }
  };
  walk(source);
  return out;
}

/** Local `use "path"` modules, read relative to the file then the CWD. */
export function localModules(entryPath: string, source: string): Record<string, string> {
  const modules: Record<string, string> = {};
  for (const { spec, content } of collectReferencedPaths(entryPath, source, /\buse\s+"([^"@][^"]*)"/g)) {
    modules[spec] = content;
  }
  return modules;
}

/** Local `link "path"` files, read relative to the file then the CWD. */
export function localLinkFiles(entryPath: string | null, source: string): LinkableFile[] {
  return collectReferencedPaths(
    entryPath,
    source,
    /^[ \t]*link\b[^\n"']*["']([^"'\n]+)["'](?:\s+as\s+[A-Za-z_][A-Za-z0-9_]*)?[ \t]*;?[ \t]*$/gm,
  ).map(({ spec, content }) => ({ name: spec, content }));
}

export interface RunOutcome {
  success: boolean;
  error?: string;
  webState?: WebState | null;
  webHtml?: string | null;
}

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
