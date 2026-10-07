/**
 * Bridge to the self-hosted understander (lang/agent/understander.sdev).
 *
 * The sdev engine runs first. It answers only when it is sure of every line;
 * otherwise (or when it fails to load or throws) it returns null and the
 * TypeScript understander handles the file as before.
 */
import SOURCE from '../../../lang/agent/understander.sdev?raw';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { Interpreter } from '../interpreter';
import type { AgentNote } from './types';

type Callable = { call: (args: unknown[], line: number) => unknown };

let entry: Callable | null | false = null;
export let engineError: string | null = null;

function load(): Callable | false {
  if (entry !== null) return entry;
  try {
    const ast = new Parser(new Lexer(SOURCE).tokenize()).parse();
    const interp = new Interpreter(() => {});
    interp.interpret(ast);
    entry = interp.getGlobalEnv().get('understand_source', 0) as Callable;
  } catch (e) {
    engineError = e instanceof Error ? e.message : String(e);
    entry = false;
  }
  return entry;
}

export interface SdevEngineResult {
  source: string;
  sure: boolean;
  notes: AgentNote[];
}

/** Ask the sdev-written understander. null = not available / it failed. */
export function sdevUnderstand(source: string, known: Iterable<string>): SdevEngineResult | null {
  const fn = load();
  if (!fn) return null;
  try {
    const r = fn.call([source, [...known]], 0) as [string, boolean, [number, string, string][]];
    if (!Array.isArray(r) || typeof r[0] !== 'string') return null;
    return {
      source: r[0],
      sure: r[1] === true,
      notes: (r[2] ?? []).map(([line, from, to]) => ({ line, from, to, why: 'understood by the sdev engine', source: 'sdev' as const })),
    };
  } catch (e) {
    engineError = e instanceof Error ? e.message : String(e);
    return null;
  }
}
