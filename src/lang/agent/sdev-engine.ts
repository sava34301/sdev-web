/**
 * Bridge to the self-hosted understander (lang/agent/understander.sdev),
 * the AI dialect (lang/agent/ai-dialect.sdev), and the self-hosted SDEV
 * parser, syntax validator & tree-walking interpreter (lang/agent/parser_eval.sdev).
 *
 * The sdev engine runs first. It answers only when it is sure of every line;
 * otherwise (or when it fails to load or throws) it returns null and the
 * TypeScript understander handles the file as before.
 */
import UNDERSTANDER from '../../../lang/agent/understander.sdev?raw';
import AI_DIALECT from '../../../lang/agent/ai-dialect.sdev?raw';
import PROJECT from '../../../lang/agent/project.sdev?raw';
import BLOCKS from '../../../lang/agent/blocks.sdev?raw';
import PARSER_EVAL from '../../../lang/agent/parser_eval.sdev?raw';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { Interpreter } from '../interpreter';
import type { AgentNote } from './types';

type Callable = { call: (args: unknown[], line: number) => unknown };
type Engine = {
  understand: Callable;
  toSdev: Callable;
  toAi: Callable;
  names: Callable;
  close: Callable;
  closeAi: Callable;
  check: Callable;
  parse: Callable;
  validate: Callable;
  eval: Callable;
};

let engine: Engine | null | false = null;
export let engineError: string | null = null;

function load(): Engine | false {
  if (engine !== null) return engine;
  try {
    const ast = new Parser(new Lexer(BLOCKS + '\n' + UNDERSTANDER + '\n' + AI_DIALECT + '\n' + PROJECT + '\n' + PARSER_EVAL).tokenize()).parse();
    const interp = new Interpreter(() => {});
    interp.interpret(ast);
    const env = interp.getGlobalEnv();
    engine = {
      understand: env.get('understand_source', 0) as Callable,
      toSdev: env.get('ai_to_sdev', 0) as Callable,
      toAi: env.get('sdev_to_ai', 0) as Callable,
      names: env.get('defined_names', 0) as Callable,
      close: env.get('close_blocks', 0) as Callable,
      closeAi: env.get('close_ai_braces', 0) as Callable,
      check: env.get('check_blocks', 0) as Callable,
      parse: env.get('sdev_parse_program', 0) as Callable,
      validate: env.get('sdev_validate_syntax', 0) as Callable,
      eval: env.get('sdev_eval_program', 0) as Callable,
    };
  } catch (e) {
    engineError = e instanceof Error ? e.message : String(e);
    engine = false;
  }
  return engine;
}

export interface SdevEngineResult {
  source: string;
  sure: boolean;
  notes: AgentNote[];
}

export interface SdevParseResult {
  ok: boolean;
  ast: unknown[];
  errors: [number, string][];
}

/**
 * Ask the sdev-written understander. null = not available / it failed.
 * `words` are dialect or remembered words as [word, canonical word].
 */
export function sdevUnderstand(source: string, known: Iterable<string>, words: [string, string][] = []): SdevEngineResult | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.understand.call([source, [...known], words], 0) as [string, boolean, [number, string, string][]];
    if (!Array.isArray(r) || typeof r[0] !== 'string') return null;
    return {
      source: r[0],
      sure: r[1] === true,
      notes: (r[2] ?? []).map(([line, from, to]) => ({ line, from, to, why: 'understood by the sdev engine', source: 'sdev' as const })),
    };
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

/** Does this file use the AI dialect (`!#ai` on its first code line)? */
export function isAiDialect(source: string): boolean {
  for (const line of source.split('\n', 20)) {
    const t = line.trim();
    if (!t || t.startsWith('//')) continue;
    return /^!#ai\b/.test(t);
  }
  return false;
}

/** sdev:ai -> canonical sdev. Returns the input unchanged if the engine is unavailable. */
export function aiToSdev(source: string): string {
  const e = load();
  if (!e) return source;
  return String(e.toSdev.call([source], 0));
}

/** canonical sdev -> sdev:ai (starts with `!#ai`). */
export function sdevToAi(source: string): string {
  const e = load();
  if (!e) return source;
  return String(e.toAi.call([source], 0));
}

const namesCache = new Map<string, string[]>();
/**
 * Names one file defines, read by lang/agent/project.sdev. Cached per file
 * content, so a large project only re-reads the files that changed.
 * null = the sdev engine is unavailable (callers use the TypeScript index).
 */
export function sdevDefinedNames(source: string): string[] | null {
  const hit = namesCache.get(source);
  if (hit) return hit;
  const e = load();
  if (!e) return null;
  try {
    const r = e.names.call([source], 0);
    if (!Array.isArray(r)) return null;
    const names = r.map(String);
    if (namesCache.size > 500) namesCache.clear();
    namesCache.set(source, names);
    return names;
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

/** Every name defined across the given files, without repeats. */
export function sdevProjectNames(sources: string[], fallback: (s: string) => Iterable<string>): string[] {
  const out = new Set<string>();
  for (const s of sources) for (const n of sdevDefinedNames(s) ?? fallback(s)) out.add(n);
  return [...out];
}

/** Close blocks the author left open (sdev-written rules). null = engine unavailable. */
export function sdevCloseBlocks(source: string): string | null {
  const e = load();
  if (!e) return null;
  try { return String(e.close.call([source], 0)); } catch (err) { engineError = String(err); return null; }
}

/** Add `}` an sdev:ai file forgot. Returns the input unchanged if the engine is unavailable. */
export function sdevCloseAiBraces(source: string): string {
  const e = load();
  if (!e) return source;
  try { return String(e.closeAi.call([source], 0)); } catch { return source; }
}

/** Blocks that never close or close twice: [line, message]. */
export function sdevCheckBlocks(source: string): [number, string][] {
  const e = load();
  if (!e) return [];
  try {
    const r = e.check.call([source], 0);
    return Array.isArray(r) ? (r as [number, string][]).map(([l, m]) => [Number(l), String(m)]) : [];
  } catch { return []; }
}

/**
 * Self-hosted canonical SDEV parser (lang/agent/parser_eval.sdev).
 * Returns { ok, ast, errors } where each error is [line, message].
 */
export function sdevParseProgram(source: string): SdevParseResult | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.parse.call([source], 0) as [boolean, unknown[], [number, string][]];
    if (!Array.isArray(r)) return null;
    return {
      ok: r[0] === true,
      ast: Array.isArray(r[1]) ? r[1] : [],
      errors: Array.isArray(r[2]) ? r[2].map(([l, m]) => [Number(l), String(m)]) : [],
    };
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

/**
 * Self-hosted SDEV syntax validator (lang/agent/parser_eval.sdev).
 * Returns { valid, errors } where each diagnostic is [line, message].
 */
export function sdevValidateSyntax(source: string): { valid: boolean; errors: [number, string][] } | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.validate.call([source], 0) as [boolean, [number, string][]];
    if (!Array.isArray(r)) return null;
    return {
      valid: r[0] === true,
      errors: Array.isArray(r[1]) ? r[1].map(([l, m]) => [Number(l), String(m)]) : [],
    };
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

/**
 * Self-hosted SDEV tree-walking interpreter (lang/agent/parser_eval.sdev).
 * Executes canonical SDEV programs and returns { ok, output, error }.
 */
export function sdevEvalProgram(source: string, inputs: string[] = []): { ok: boolean; output: string[]; error: string | null } | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.eval.call([source, inputs], 0) as [boolean, unknown[], unknown];
    if (!Array.isArray(r)) return null;
    return {
      ok: r[0] === true,
      output: Array.isArray(r[1]) ? r[1].map(String) : [],
      error: r[2] != null && r[2] !== '' ? String(r[2]) : null,
    };
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}
