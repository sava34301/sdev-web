import { withoutBoardBlocks } from './boards';
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
import { taskRequest } from './tasks';
import { baseWordMap, CANONICAL, type Intent } from './vocabulary';
import { KEYWORD_TOKEN_BY_WORD } from '@/lang/keywords';

export interface Sense {
  parses: boolean;
  suspicious: boolean;
  reasons: string[];
  /** parses, defines every name it uses, and only differs in style */
  working?: boolean;
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
let runtimeCache: Set<string> | null = null;
const WEB_CONTEXT_ONLY_NAMES = new Set([
  'a', 'b', 'i', 'p', 'q', 's', 'u', 'g',
  'output', 'var', 'sub', 'show',
]);
/** names the interpreter itself defines (speak, print, len, …) — without the window toolkit */
function runtimeNames(): Set<string> {
  if (!runtimeCache) {
    try {
      const env = (new Interpreter(() => {}) as unknown as { globalEnv: { values: Map<string, unknown> } }).globalEnv;
      runtimeCache = new Set([...env.values.keys()].filter((k) => !WEB_CONTEXT_ONLY_NAMES.has(k)));
    } catch { runtimeCache = new Set(); }
  }
  return runtimeCache;
}
/** every name the runtime provides before the first line runs */
export function builtinNames(): Set<string> {
  if (!builtinCache) {
    try {
      builtinCache = new Set(runtimeNames());
      // the window toolkit (window, button, label, uiget, …) is there in the IDE too
      for (const n of ['window','endwindow','row','endrow','column','endcolumn','group','endgroup','tabs','endtabs','tab','endtab','heading','label','paragraph','image','divider','spacer','progress','button','textarea','checkbox','slider','select','table','menu','endmenu','menuitem','uiget','uiset','show','alert']) builtinCache.add(n);
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
  add(new RegExp(`\\b(?:iterate|within|spell|lambda|essence|rescue|except|alias)\\s+(${NAME})`, 'gu'));
  add(new RegExp(`\\b(?:iterate|for)\\s+${NAME}\\s*,\\s*(${NAME})`, 'gu'));
  // lambdas `(a, b) =>` / `x =>` / sdev's own `(a, b) ->` / `x ->`
  for (const m of source.matchAll(new RegExp(`\\(([^()]*)\\)\\s*(?:=>|->)|(${NAME})\\s*(?:=>|->)`, 'gu'))) {
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
  const isWebProgram = /\b(?:page|endpage|html_\w+|open_\w+)\s*\(/.test(source);
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
    if (isWebProgram && WEB_CONTEXT_ONLY_NAMES.has(name)) continue;
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

/**
 * sdev's own spellings are never "another way of writing" something:
 * every keyword the lexer accepts (forge, conjure, ponder, yield, let, fn, …)
 * and every function the runtime defines (speak, print, …) is real sdev.
 */
export function isSdevWord(word: string, line = ''): boolean {
  if (Object.prototype.hasOwnProperty.call(KEYWORD_TOKEN_BY_WORD, word)) return true;
  // a runtime function only counts when the line really calls it: `speak(x)`, not `shout "hi"`
  return runtimeNames().has(word) && new RegExp(`^${word}\\s*\\(`, 'i').test(line);
}

/** a line with its strings and sdev's `::` / `;;` block marks taken out */
function codeOnly(line: string): string {
  return line.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""').replace(/::|;;/g, ' ');
}

/** reasons that only say the file is written in another style — not that it means something else */
const STYLE_ONLY = /several statements on one line|looks like an assignment written another way/;

export function senseFile(source: string, extra?: Map<string, Intent>): Sense {
  const reasons: string[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    const head = line.split(/[\s(]+/)[0].toLowerCase();
    if ((head !== 'say' && mathRequest(line) !== null) || taskRequest(line) !== null) {
      reasons.push(`line ${i + 1}: a calculation asked for in words`);
      continue;
    }
    if ((NON_CANONICAL_HEAD.has(head) && !isSdevWord(head, line)) || extra?.has(head)) {
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
    if (/;\s*\S/.test(codeOnly(line))) reasons.push(`line ${i + 1}: several statements on one line`);

    // Plain English written as code: three or more bare words with no call,
    // no quotes and no operators. It may parse, but it means nothing.
    const known = baseWordMap().has(head) || extra?.has(head);
    if (!known && /^[\p{L}_][\p{L}\p{N}_]*(?:\s+[\p{L}\p{N}_]+){2,}$/u.test(line)) {
      reasons.push(`line ${i + 1}: reads like a sentence, not a statement`);
    }
    // "say to terminal x" — the destination is spelled out in words.
    if (/\b(?:to|on|in|into|out)\s+(?:the\s+)?(?:terminal|console|screen|display|stdout)\b/i.test(codeOnly(line))) {
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
  // A file that parses, uses only names it defines, and is merely written in
  // another style is working code — it must reach the compiler as written.
  const working = ok && unknown.size === 0 && reasons.every((r) => STYLE_ONLY.test(r));
  return { parses: ok, suspicious: !ok || (reasons.length > 0 && !working), reasons, working };
}

/**
 * For files the v1 parser cannot judge (sdev v2): does a line open with a
 * word that is plainly not sdev — `terminal x`, `output Hello`, `ask name`?
 * Those still compile as a bare expression, so compiling is not proof the
 * author got what they meant; such a file is read by the agent first.
 */
export function wordsNeedReading(source: string): boolean {
  return senseFile(withoutBoardBlocks(source)).reasons.some((r) =>
    /is not canonical sdev|asks for input in words|names the output destination/.test(r) && !/"[^"]*[^\x00-\x7F][^"]*"/.test(r));
}
