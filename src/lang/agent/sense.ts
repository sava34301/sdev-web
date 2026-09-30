/**
 * Does this file need the agent at all?
 *
 * Parsing alone is not proof of intent: `terminal "hi"` parses fine in v1 and
 * silently does nothing. So the sense check looks for lines that parse but
 * clearly mean something else, as well as lines that do not parse.
 */
import { Lexer } from '@/lang/lexer';
import { Parser } from '@/lang/parser';
import { Interpreter } from '@/lang/interpreter';
import { TokenType } from '@/lang/tokens';
import { mathRequest } from './math';
import { baseWordMap, CANONICAL, type Intent } from './vocabulary';

export interface Sense {
  parses: boolean;
  suspicious: boolean;
  reasons: string[];
}

export function parseError(source: string): string | null {
  try { new Parser(new Lexer(source).tokenize()).parse(); return null; }
  catch (e) { return e instanceof Error ? e.message : String(e); }
}

export function parses(source: string): boolean {
  try {
    new Parser(new Lexer(source).tokenize()).parse();
    return true;
  } catch {
    return false;
  }
}

let builtinCache: Set<string> | null = null;
/** every name the runtime provides before the first line runs */
export function builtinNames(): Set<string> {
  if (!builtinCache) {
    try {
      const env = (new Interpreter(() => {}) as unknown as { globalEnv: { values: Map<string, unknown> } }).globalEnv;
      builtinCache = new Set(env.values.keys());
    } catch { builtinCache = new Set(); }
  }
  return builtinCache;
}

const NAME = '[\\p{L}_][\\p{L}\\p{N}_]*';

/** names the file itself introduces: variables, functions, parameters, loop variables, kinds */
export function definedNames(source: string): Set<string> {
  const out = new Set<string>();
  const add = (re: RegExp, group = 1) => { for (const m of source.matchAll(re)) if (m[group]) out.add(m[group]); };
  add(new RegExp(`\\b(?:set|let|forge|var|const|kind|class|conjure|to|func|function|fn|def|as|catch|rescue|import|use|summon)\\s+(${NAME})`, 'gu'));
  add(new RegExp(`\\bfor\\s+(?:each\\s+)?(${NAME})`, 'gu'));
  add(new RegExp(`\\bfor\\s+(?:each\\s+)?${NAME}\\s*,\\s*(${NAME})`, 'gu'));
  add(new RegExp(`^\\s*(${NAME})\\s*(?:=|\\+=|-=|\\*=|/=)(?!=)`, 'gmu'));
  // parameters: `with a b c`, `with a, b`, `(a, b)` after a declaration
  for (const m of source.matchAll(new RegExp(`\\bwith\\s+([^\\n:{]+)`, 'gu'))) {
    for (const w of m[1].split(/[\s,]+/)) if (new RegExp(`^${NAME}$`, 'u').test(w)) out.add(w);
  }
  for (const m of source.matchAll(new RegExp(`\\b(?:to|conjure|func|function|fn|def)\\s+${NAME}\\s*\\(([^)]*)\\)`, 'gu'))) {
    for (const w of m[1].split(/[\s,=]+/)) if (new RegExp(`^${NAME}$`, 'u').test(w)) out.add(w);
  }
  // lambdas `(a, b) =>` / `x =>`
  for (const m of source.matchAll(new RegExp(`\\(([^()]*)\\)\\s*=>|(${NAME})\\s*=>`, 'gu'))) {
    for (const w of (m[1] ?? m[2] ?? '').split(/[\s,]+/)) if (w) out.add(w);
  }
  return out;
}

/**
 * Bare words the file uses that nothing defines — the tell-tale of plain
 * language written as code ("calculate", "reverse", "hello"). Properties
 * (`a.b`) and record keys (`{ key: 1 }`) are not counted.
 */
export function unknownNames(source: string): string[] {
  let tokens: { type: string; value: unknown }[];
  try { tokens = new Lexer(source).tokenize() as unknown as { type: string; value: unknown }[]; } catch { return []; }
  const defined = definedNames(source);
  const builtins = builtinNames();
  const out = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== TokenType.IDENTIFIER) continue;
    const name = String(t.value);
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    if (prev && (String(prev.value) === '.' || prev.type === 'DOT')) continue;
    if (next && (next.type === 'COLON' || String(next.value) === ':') ) continue;
    if (/[^\x00-\x7F]/.test(name)) continue;
    if (['end', 'else', 'self', 'this', 'me', 'super', 'to', 'with', 'each', 'of', 'from', 'by', 'step', 'more', 'less', 'essence', 'value'].includes(name)) continue;
    if (defined.has(name) || builtins.has(name)) continue;
    out.add(name);
  }
  return [...out];
}

const NON_CANONICAL_HEAD = (() => {
  const map = baseWordMap();
  const out = new Map<string, Intent>();
  for (const [word, intent] of map) if (word !== CANONICAL[intent]) out.set(word, intent);
  return out;
})();

export function senseFile(source: string, extra?: Map<string, Intent>): Sense {
  const reasons: string[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    const head = line.split(/[\s(]+/)[0].toLowerCase();
    if (head !== 'say' && mathRequest(line) !== null) {
      reasons.push(`line ${i + 1}: a calculation asked for in words`);
      continue;
    }
    if (NON_CANONICAL_HEAD.has(head) || extra?.has(head)) {
      reasons.push(`line ${i + 1}: "${head}" is not canonical sdev`);
      continue;
    }
    // `ask name` / `set x to ask` parse, but only input() actually reads a line.
    if (head === 'ask' || /\bto\s+ask\b/i.test(line)) {
      reasons.push(`line ${i + 1}: asks for input in words`);
      continue;
    }
    if (/^[\p{L}\p{N}_]+\s+(?:will be|becomes|gets|is now|should be|shall be|=|:=|<-)\s+/iu.test(line)) {
      reasons.push(`line ${i + 1}: looks like an assignment written another way`);
    }
    if (/;\s*\S/.test(line)) reasons.push(`line ${i + 1}: several statements on one line`);

    // Plain English written as code: three or more bare words with no call,
    // no quotes and no operators. It may parse, but it means nothing.
    const known = baseWordMap().has(head) || extra?.has(head);
    if (!known && /^[\p{L}_][\p{L}\p{N}_]*(?:\s+[\p{L}\p{N}_]+){2,}$/u.test(line)) {
      reasons.push(`line ${i + 1}: reads like a sentence, not a statement`);
    }
    // "say to terminal x" — the destination is spelled out in words.
    if (/\b(?:to|on|in|into|out)\s+(?:the\s+)?(?:terminal|console|screen|display|stdout)\b/i.test(line)) {
      reasons.push(`line ${i + 1}: names the output destination in words`);
    }
    // "call greet with 2"
    if (/^(?:call|run|invoke|execute|use)\s+[\p{L}\p{N}_]+/iu.test(line)) {
      reasons.push(`line ${i + 1}: a call written in words`);
    }
  }

  // A line that opens with a word nothing defines is a sentence, not code.
  const unknown = new Set(unknownNames(source));
  if (unknown.size) {
    for (let i = 0; i < lines.length; i++) {
      const head = lines[i].trim().match(/^[A-Za-z_]\w*/)?.[0];
      if (head && unknown.has(head)) reasons.push(`line ${i + 1}: "${head}" is not defined anywhere`);
    }
    if (!reasons.length) reasons.push(`uses names nothing defines: ${[...unknown].slice(0, 5).join(', ')}`);
  }

  const ok = parses(source);
  return { parses: ok, suspicious: !ok || reasons.length > 0, reasons };
}
