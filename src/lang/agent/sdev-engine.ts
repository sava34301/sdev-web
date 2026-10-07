/**
 * Bridge to the self-hosted understander (lang/agent/understander.sdev) and
 * the AI dialect (lang/agent/ai-dialect.sdev).
 *
 * The sdev engine runs first. It answers only when it is sure of every line;
 * otherwise (or when it fails to load or throws) it returns null and the
 * TypeScript understander handles the file as before.
 */
import UNDERSTANDER from '../../../lang/agent/understander.sdev?raw';
import AI_DIALECT from '../../../lang/agent/ai-dialect.sdev?raw';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { Interpreter } from '../interpreter';
import type { AgentNote } from './types';

type Callable = { call: (args: unknown[], line: number) => unknown };
type Engine = { understand: Callable; toSdev: Callable; toAi: Callable };

let engine: Engine | null | false = null;
export let engineError: string | null = null;

function load(): Engine | false {
  if (engine !== null) return engine;
  try {
    const ast = new Parser(new Lexer(UNDERSTANDER + '\n' + AI_DIALECT).tokenize()).parse();
    const interp = new Interpreter(() => {});
    interp.interpret(ast);
    const env = interp.getGlobalEnv();
    engine = {
      understand: env.get('understand_source', 0) as Callable,
      toSdev: env.get('ai_to_sdev', 0) as Callable,
      toAi: env.get('sdev_to_ai', 0) as Callable,
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
