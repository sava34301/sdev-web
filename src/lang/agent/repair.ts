/**
 * The rule brain.
 *
 * Reads a whole file the way a person would — line by line, remembering what
 * was said earlier — and writes canonical sdev. No network, no model: this is
 * what keeps the agent working offline and inside the compiler pipeline.
 */
import {
  VOCABULARY,
  ASSIGN_PHRASES,
  CANONICAL,
  COMPARISONS,
  NUMBER_WORDS,
  baseWordMap,
  type Intent,
} from './vocabulary';
import type { AgentNote } from './types';

const PLACEHOLDER = '\u0000';

interface Masked {
  line: string;
  strings: string[];
  comment: string;
}

function mask(raw: string): Masked {
  const strings: string[] = [];
  let line = '';
  let comment = '';
  let i = 0;
  while (i < raw.length) {
    const c = raw[i];
    if (c === '#' || (c === '/' && raw[i + 1] === '/')) {
      comment = ' #' + raw.slice(i).replace(/^#|^\/\//, '');
      break;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      let s = '';
      i++;
      while (i < raw.length && raw[i] !== quote) {
        if (raw[i] === '\\' && i + 1 < raw.length) { s += raw[i] + raw[i + 1]; i += 2; continue; }
        s += raw[i];
        i++;
      }
      i++;
      line += `${PLACEHOLDER}${strings.length}${PLACEHOLDER}`;
      strings.push('"' + s.replace(/"/g, '\\"') + '"');
      continue;
    }
    line += c;
    i++;
  }
  return { line, strings, comment };
}

function unmask(line: string, strings: string[]): string {
  return line.replace(/\u0000(\d+)\u0000/g, (_m, i) => strings[Number(i)]);
}

function isMaskedString(token: string): boolean {
  return /^\u0000\d+\u0000$/.test(token);
}

const RESERVED = new Set([
  'say', 'ask', 'set', 'to', 'if', 'else', 'end', 'for', 'each', 'in', 'while',
  'break', 'continue', 'with', 'return', 'make', 'capture', 'ref', 'call',
  'attempt', 'rescue', 'throw', 'kind', 'has', 'does', 'new', 'self',
  'extends', 'super', 'use', 'true', 'false', 'nothing', 'is', 'not', 'and',
  'or', 'more', 'less', 'match',
]);

const BUILTINS = new Set([
  'range', 'len', 'sum', 'str', 'text', 'num', 'ord', 'chr', 'upper', 'lower',
  'trim', 'split', 'join', 'find', 'replace', 'abs', 'min', 'max', 'floor',
  'ceil', 'sqrt', 'pow', 'random', 'keys', 'values', 'read_file', 'write_file',
  'append_file', 'file_exists', 'input', 'args', 'env', 'exit', 'now_ms',
  'sleep_ms', 'say_err',
]);

export interface RepairContext {
  /** extra word -> intent pairs learned from memory or a dialect */
  extraWords?: Map<string, Intent>;
  /** names the user is known to use */
  knownNames?: Set<string>;
  /** never guess — only rewrite unambiguous lines */
  strict?: boolean;
}

export interface RepairResult {
  source: string;
  notes: AgentNote[];
  learned: Record<string, Intent>;
  /** 1-based line numbers the agent did not feel sure about */
  unresolved: number[];
  changed: boolean;
}

/** Polite sentence openers people write in front of a real statement. */
const FILLER_HEAD = /^(?:i\s+(?:want|need|would\s+like|wanna|will|'d\s+like)|we\s+(?:want|need|should)|please|let\s*'?s|can\s+you|could\s+you|now|then|first|also|and)\s+(?:to\s+)?/i;
/** Words that carry no meaning inside a declaration. */
const DECL_NOISE = /\b(?:called|named|a|an|the|new|variable|variables|parameter|parameters|argument|arguments|that|which|takes|taking|accepts)\b/gi;
/** Where output goes: the terminal, the screen, the console — always the same place. */
const SAY_TARGET = /^(?:(?:out|to|on|in|into|at)\s+)?(?:the\s+)?(?:terminal|console|screen|output|display|stdout)\s*(?::|,)?\s*/i;

/** A name the compiler accepts. `11` becomes `n11`, `my name` becomes `my_name`. */
function safeName(raw: string): string {
  const cleaned = raw.replace(/[^\p{L}\p{N}_]/gu, '_').replace(/^_+|_+$/g, '');
  if (!cleaned) return 'value';
  return /^[\p{N}]/u.test(cleaned) ? 'n' + cleaned : cleaned;
}

function wordsOf(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

/** Split `a; b` into separate statements without breaking strings. */
function splitStatements(line: string): string[] {
  return line.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
}

function numberWord(token: string): string | null {
  const parts = token.toLowerCase().split(/[\s-]+/);
  if (!parts.every((p) => p in NUMBER_WORDS)) return null;
  let total = 0;
  let current = 0;
  for (const p of parts) {
    const v = NUMBER_WORDS[p];
    if (v === 100) current = (current || 1) * 100;
    else if (v >= 1000) { total += (current || 1) * v; current = 0; }
    else current += v;
  }
  return String(total + current);
}

const LITERALS: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const w of VOCABULARY.nothing) out[w] = 'nothing';
  for (const w of VOCABULARY.true) out[w] = 'true';
  for (const w of VOCABULARY.false) out[w] = 'false';
  return out;
})();

/** Turn a loose right-hand side into a canonical sdev expression. */
function expression(rest: string, known: Set<string>, renames?: Map<string, string>): string {
  if (renames?.size) {
    rest = rest.replace(/[\p{L}\p{N}_]+/gu, (t) => renames.get(t) ?? t);
  }
  const trimmed = rest.trim();
  if (!trimmed) return 'nothing';
  const literal = LITERALS[trimmed.toLowerCase()];
  if (literal) return literal;

  // already an expression the compiler understands
  if (/^[\u0000\d(]/.test(trimmed) && !/\u0000\s+\u0000/.test(trimmed)) {
    if (isMaskedString(trimmed) || /^[\d.]+$/.test(trimmed) || trimmed.startsWith('(')) return trimmed;
  }

  const tokens = wordsOf(trimmed);
  const ownName = tokens.length === 1 && known.has(tokens[0]);
  const numeric = ownName ? null : numberWord(tokens.join(' '));
  if (numeric !== null) return numeric;

  const understood = tokens.every((t) => {
    if (isMaskedString(t)) return true;
    if (/^[\d.]+$/.test(t)) return true;
    if (/^[-+*/%<>=!,()[\]]+$/.test(t)) return true;
    const bare = t.replace(/[(),[\]]/g, '');
    if (!bare) return true;
    if (RESERVED.has(bare) || BUILTINS.has(bare)) return true;
    if (known.has(bare)) return true;
    if (/[(.[]/.test(t)) return true;
    return false;
  });

  if (understood) return joinOperands(tokens);

  const allBare = tokens.every((t) => !isMaskedString(t));
  // Operators the agent does not know about (pipes, bitwise, member access…)
  // mean this is code, not prose — leave it exactly as the author wrote it.
  // A `.` or `:` only counts as code when it joins two things with no spaces
  // (`user.name`, `map:key`); a trailing full stop or "Result: ok" is prose.
  const codeOperator = /[|&^~@$\\]/.test(trimmed);
  const codePunctuation = /[\w\u0000)\]][.:][\w\u0000([]/.test(trimmed);
  // A record/list literal written out in full (`{ theme: "dark" }`, `[1, 2]`)
  // is code, whatever the spacing around its colons.
  const codeLiteral = (/^\{[\s\S]*\}$/.test(trimmed) || /^\[[\s\S]*\]$/.test(trimmed));
  if (codeOperator || codePunctuation || codeLiteral) return trimmed;
  if (allBare && !tokens.some((t) => known.has(t))) return '"' + tokens.join(' ').replace(/"/g, '\\"') + '"';

  // mixed: text runs become strings, the author's names stay values —
  // `Hello, name` -> "Hello, " + name
  const isValue = (t: string) => isMaskedString(t) || /^[\d.]+$/.test(t) || known.has(t) || BUILTINS.has(t) || /[(.[]/.test(t);
  const pieces: { kind: 'text' | 'value' | 'op'; v: string }[] = [];
  for (const t of tokens) {
    if (/^[-+*/%]$/.test(t)) pieces.push({ kind: 'op', v: t });
    else if (isValue(t)) pieces.push({ kind: 'value', v: t });
    else if (pieces.length && pieces[pieces.length - 1].kind === 'text') pieces[pieces.length - 1].v += ' ' + t;
    else pieces.push({ kind: 'text', v: t });
  }
  const parts = pieces.map((p, i) => {
    if (p.kind !== 'text') return p.v;
    const before = i > 0 && pieces[i - 1].kind === 'value' ? ' ' : '';
    const after = i < pieces.length - 1 && pieces[i + 1].kind === 'value' ? ' ' : '';
    return '"' + (before + p.v + after).replace(/"/g, '\\"') + '"';
  });
  return joinOperands(parts);
}

/** `"Hello, " name` -> `"Hello, " + name`: two values side by side are joined. */
function joinOperands(tokens: string[]): string {
  const operand = (t: string) =>
    !/^[-+*/%<>=!,]+$/.test(t) && !RESERVED.has(t) && !t.endsWith('(') && !t.endsWith(',') && !t.startsWith(')');
  const out: string[] = [];
  tokens.forEach((t, i) => {
    if (i > 0 && operand(tokens[i - 1]) && operand(t) && !t.startsWith('(')) out.push('+');
    out.push(t);
  });
  return out.join(' ');
}

interface ConditionInfo {
  /** answers that are words: compared ignoring capitals and spaces */
  textAsks?: Set<string>;
  /** the line's string literals, so compared words can be lower-cased */
  strings?: string[];
}

function condition(rest: string, known: Set<string>, renames?: Map<string, string>, info: ConditionInfo = {}): string {
  let out = ' ' + rest.trim() + ' ';
  if (renames?.size) out = out.replace(/[\p{L}\p{N}_]+/gu, (t) => renames.get(t) ?? t);
  for (const [re, to] of COMPARISONS) out = out.replace(re, to);
  out = out
    .replace(/\bthen\b/gi, ' ')
    .replace(/[:{]\s*$/, ' ')
    .replace(/\s*==\s*/g, ' is ')
    .replace(/\s*!=\s*/g, ' is not ')
    .replace(/\s*>=\s*/g, ' is or more ')
    .replace(/\s*<=\s*/g, ' is or less ')
    .replace(/\s+/g, ' ')
    .trim();
  const toks = out.split(' ');
  // stray number words, and bare words the file never introduced (`answer is yes`)
  const mapped = toks.map((t, i) => {
    if (isMaskedString(t) || known.has(t)) return t;
    if (numberWord(t) !== null) return numberWord(t)!;
    if (/^[\p{L}_][\p{L}\p{N}_]*$/u.test(t) && !RESERVED.has(t.toLowerCase()) && !BUILTINS.has(t)) {
      const prev = toks[i - 1]?.toLowerCase();
      if (prev === 'is' || prev === 'not' || prev === 'equals') return '"' + t.toLowerCase() + '"';
    }
    return t;
  });
  // a typed word answer: "Yes", " yes " and "yes" are the same answer
  for (let i = 0; i + 2 < mapped.length; i++) {
    const name = mapped[i];
    if (!info.textAsks?.has(name) || mapped[i + 1] !== 'is') continue;
    const j = mapped[i + 2] === 'not' ? i + 3 : i + 2;
    const lit = mapped[j];
    if (!lit || !(isMaskedString(lit) || /^".*"$/.test(lit))) continue;
    if (isMaskedString(lit) && info.strings) {
      const k = Number(lit.slice(1, -1));
      info.strings[k] = info.strings[k].toLowerCase().replace(/^"\s+|\s+"$/g, '"');
    }
    mapped[i] = `lower(trim(${name}))`;
  }
  return mapped.join(' ');
}

const ASSIGN_RE = new RegExp(
  `^([\\p{L}\\p{N}_]+)\\s+(?:${ASSIGN_PHRASES.filter((p) => /^[a-zа-я ]+$/i.test(p))
    .sort((a, b) => b.length - a.length)
    .join('|')})\\s+(.+)$`,
  'iu',
);
const ASSIGN_SYMBOL_RE = /^([\p{L}\p{N}_]+)\s*(?::=|<-|=(?!=))\s*(.+)$/u;

/** Intents whose words people also pick as their own variable names. */
const NAMEABLE_INTENTS = new Set<Intent>(['return', 'true', 'false', 'nothing', 'in', 'and', 'or', 'not', 'continue', 'break']);

const NAME_PAT = '[\\p{L}_][\\p{L}\\p{N}_]*';
const ASK_INTO = new RegExp(
  `^(?:for\\s+)?(\\u0000\\d+\\u0000)?\\s*,?\\s*(?:(?:and\\s+)?(?:save|store|put|keep|remember|call|name)(?:\\s+it|\\s+the\\s+answer)?(?:\\s+(?:as|in|into|to))?|as|into|in|to|->|=>)\\s+(?:the\\s+|a\\s+)?(${NAME_PAT})\\s*[.:]?$`,
  'iu',
);
const ASK_PROMPT_ONLY = /^(?:for\s+)?(\u0000\d+\u0000)\s*[.:]?$/u;
const ASK_NAME_ONLY = new RegExp(`^(?:for\\s+)?(?:(?:the|a|an|their|your|his|her|my)\\s+)?(${NAME_PAT})\\s*[?.:]?$`, 'iu');

interface AskForm { name: string; prompt: string | null }

/** "ask "Name?" as name", "ask for age", "ask "Ready?"" — what is asked, and where it goes. */
function parseAsk(rest: string): AskForm | null {
  const r = rest.trim()
    .replace(/^(?:the\s+)?(?:user|person|player|them)\s+(?:for\s+)?/i, '')
    .replace(/^\(|\)$/g, '')
    .trim();
  let m = r.match(ASK_INTO);
  if (m) return { name: m[2], prompt: m[1] ?? null };
  m = r.match(ASK_PROMPT_ONLY);
  if (m) return { name: 'answer', prompt: m[1] };
  m = r.match(ASK_NAME_ONLY);
  if (m) return { name: m[1], prompt: null };
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Every answer the program asks for, and which of them are numbers. A typed
 * answer is text; it is a number when the question asks for one, or when the
 * program does arithmetic with it or compares it to a number.
 */
function scanAsks(lines: string[], words: Map<string, Intent>) {
  const asks = new Map<string, string>();
  const masked: string[] = [];
  for (const raw of lines) {
    const { line, strings } = mask(raw);
    masked.push(line);
    const text = (t: string | null | undefined) => (t ? unmask(t, strings) : '');
    for (const stmt0 of splitStatements(line)) {
      const stmt = stmt0.replace(FILLER_HEAD, '').trim();
      const toks = wordsOf(stmt);
      if (!toks.length) continue;
      if (words.get(toks[0].toLowerCase()) === 'ask') {
        const f = parseAsk(stmt.slice(toks[0].length));
        if (f) asks.set(f.name, text(f.prompt));
        continue;
      }
      const m = stmt.match(ASSIGN_SYMBOL_RE) ?? stmt.match(ASSIGN_RE);
      if (m) {
        const rt = wordsOf(m[2]);
        if (rt[0] && words.get(rt[0].toLowerCase().replace(/\($/, '')) === 'ask') asks.set(m[1], text(rt[1]));
      }
    }
  }
  const numeric = new Set<string>();
  const body = masked.join('\n');
  const edge = '(?<![\\p{L}\\p{N}_])';
  const tail = '(?![\\p{L}\\p{N}_])';
  const names = [...asks.keys()];
  for (const [name, prompt] of asks) {
    if (/\b(?:number|numbers|how\s+(?:many|much|old|far|long|tall)|age|amount|count|price|total)\b|\d/i.test(prompt)) {
      numeric.add(name);
      continue;
    }
    const n = escapeRe(name);
    const arithmetic = new RegExp(`${edge}${n}${tail}\\s*[-*/%]|[-*/%]\\s*${edge}${n}${tail}`, 'u');
    const againstNumber = new RegExp(
      `${edge}${n}${tail}\\s*(?:is(?:\\s+not)?|equals|==|!=|>=|<=|>|<|is\\s+(?:greater|less|more|bigger|smaller)(?:\\s+than)?|(?:greater|less|more|bigger|smaller)\\s+than)\\s*-?\\d`,
      'iu',
    );
    const plusNumber = new RegExp(`${edge}${n}${tail}\\s*\\+\\s*\\d|\\d\\s*\\+\\s*${edge}${n}${tail}`, 'u');
    if (arithmetic.test(body) || againstNumber.test(body) || plusNumber.test(body)) numeric.add(name);
  }
  // `a + b` where both are answers: the author is adding numbers
  for (const a of names) for (const b of names) {
    if (new RegExp(`${edge}${escapeRe(a)}${tail}\\s*\\+\\s*${edge}${escapeRe(b)}${tail}`, 'u').test(body)) {
      numeric.add(a);
      numeric.add(b);
    }
  }
  return { asks, numeric };
}

/** "Hello, [name]" -> ("Hello, " + str(name)) when `name` is the author's own. */
function fillPlaceholders(literal: string, known: Set<string>): string {
  const inner = literal.slice(1, -1);
  const re = /\[([\p{L}_][\p{L}\p{N}_]*)\]|\{([\p{L}_][\p{L}\p{N}_]*)\}/gu;
  if (![...inner.matchAll(re)].some((m) => known.has(m[1] ?? m[2]))) return literal;
  const pieces: string[] = [];
  let last = 0;
  for (const m of inner.matchAll(re)) {
    const name = m[1] ?? m[2];
    if (!known.has(name)) continue;
    if (m.index! > last) pieces.push('"' + inner.slice(last, m.index) + '"');
    pieces.push(`str(${name})`);
    last = m.index! + m[0].length;
  }
  if (last < inner.length) pieces.push('"' + inner.slice(last) + '"');
  return '(' + pieces.join(' + ') + ')';
}

/** "add 1 to score", "increase score by 2", "take 3 from lives", "score++". */
function counting(stmt: string): { name: string; op: '+' | '-'; by: string } | null {
  const s = stmt.replace(/[.:]\s*$/, '').trim();
  let m = s.match(new RegExp(`^(?:add|plus)\\s+(.+?)\\s+(?:to|onto)\\s+(?:the\\s+)?(${NAME_PAT})$`, 'iu'));
  if (m) return { name: m[2], op: '+', by: m[1] };
  m = s.match(new RegExp(`^(?:subtract|take|remove|minus)\\s+(.+?)\\s+(?:from|off)\\s+(?:the\\s+)?(${NAME_PAT})$`, 'iu'));
  if (m) return { name: m[2], op: '-', by: m[1] };
  m = s.match(new RegExp(`^(increase|raise|bump|increment|decrease|reduce|decrement)\\s+(?:the\\s+)?(${NAME_PAT})(?:\\s+by\\s+(.+))?$`, 'iu'));
  if (m) return { name: m[2], op: /^(?:decrease|reduce|decrement)$/i.test(m[1]) ? '-' : '+', by: m[3] ?? '1' };
  m = s.match(new RegExp(`^(${NAME_PAT})\\s*(\\+\\+|--)$`, 'u'));
  if (m) return { name: m[1], op: m[2] === '++' ? '+' : '-', by: '1' };
  m = s.match(new RegExp(`^(${NAME_PAT})\\s*([+-])=\\s*(.+)$`, 'u'));
  if (m) return { name: m[1], op: m[2] as '+' | '-', by: m[3] };
  return null;
}

/** Collect the names the file introduces, so bare words can be told apart. */
function collectNames(lines: string[], words: Map<string, Intent>, seed?: Set<string>): Set<string> {
  const names = new Set<string>(seed ?? []);
  const nameable = (w: string) => { const i = words.get(w.toLowerCase()); return !i || NAMEABLE_INTENTS.has(i); };
  for (const raw of lines) {
    const { line } = mask(raw);
    for (const stmt of splitStatements(line)) {
      const toks = wordsOf(stmt);
      if (!toks.length) continue;
      const head = words.get(toks[0].toLowerCase());
      if (head === 'ask') { const f = parseAsk(stmt.slice(toks[0].length)); if (f) names.add(f.name); continue; }
      if (head === 'set' && toks[1]) { names.add(toks[1].replace(/[^\p{L}\p{N}_]/gu, '')); continue; }
      if (head === 'function' && toks[1]) {
        names.add(toks[1].replace(/[^\p{L}\p{N}_]/gu, ''));
        for (const p of toks.slice(2)) if (!words.has(p.toLowerCase()) && p !== 'with') names.add(p);
        continue;
      }
      if (head === 'for') {
        const each = toks.findIndex((t) => words.get(t.toLowerCase()) === 'in');
        if (each > 1) names.add(toks[each - 1]);
        continue;
      }
      const m = stmt.match(ASSIGN_SYMBOL_RE) ?? stmt.match(ASSIGN_RE);
      if (m && nameable(m[1]) && (!head || NAMEABLE_INTENTS.has(head)) && !/^(?:if|when|while)$/i.test(toks[0])) names.add(m[1]);
    }
  }
  return names;
}

export function repair(source: string, ctx: RepairContext = {}): RepairResult {
  const words = baseWordMap();
  /** Words the *user* taught the agent (dialect + memory) — as opposed to the built-in vocabulary. */
  const ownWords = new Set<string>();
  for (const [w, i] of ctx.extraWords ?? []) { words.set(w.toLowerCase(), i); ownWords.add(w.toLowerCase()); }

  const rawLines = source.split('\n');
  const known = collectNames(rawLines, words, ctx.knownNames);
  const { asks, numeric } = scanAsks(rawLines, words);
  for (const name of asks.keys()) known.add(name);
  /** answers that are words, compared without caring about capitals */
  const textAsks = new Set([...asks.keys()].filter((n) => !numeric.has(n)));

  /** `set name to input("…")`, as a number when the program treats it as one */
  const askValue = (name: string, prompt: string | null) => {
    const read = `input(${prompt ?? `"${name}? "`})`;
    return `set ${name} to ${numeric.has(name) ? `num(${read})` : read}`;
  };
  /** the right-hand side `ask "…"` — returns the prompt token, or undefined */
  const askRhs = (rhs: string): string | null | undefined => {
    const t = wordsOf(rhs);
    if (!t.length || words.get(t[0].toLowerCase().replace(/\($/, '')) !== 'ask') return undefined;
    const tail = t.slice(1).join(' ').replace(/^\(|\)$/g, '').trim();
    if (!tail) return null;
    return isMaskedString(tail) ? tail : undefined;
  };
  /** can this word be the author's own variable name? */
  const nameable = (w: string) => {
    const intent = words.get(w.toLowerCase());
    return !intent || NAMEABLE_INTENTS.has(intent);
  };
  const nextIndented = (index: number) => {
    const here = rawLines[index].match(/^\s*/)?.[0].length ?? 0;
    for (let j = index + 1; j < rawLines.length; j++) {
      if (!rawLines[j].trim()) continue;
      return (rawLines[j].match(/^\s*/)?.[0].length ?? 0) > here;
    }
    return false;
  };
  /** names the user wrote that the compiler can't take, and what they became */
  const renames = new Map<string, string>();
  const notes: AgentNote[] = [];
  const learned: Record<string, Intent> = {};
  const unresolved: number[] = [];
  let changed = false;

  const note = (line: number, from: string, to: string, why: string) => {
    if (from.trim() === to.trim()) return;
    changed = true;
    notes.push({ line, from: from.trim(), to: to.trim(), why, source: 'rules' });
  };

  const learn = (word: string, intent: Intent) => {
    const lower = word.toLowerCase();
    if (lower !== CANONICAL[intent]) learned[lower] = intent;
  };

  const out = rawLines.map((raw, index) => {
    const lineNo = index + 1;
    if (!raw.trim()) return raw;
    const indent = raw.match(/^\s*/)?.[0] ?? '';
    const { line, strings, comment } = mask(raw);
    if (!line.trim()) return raw;
    // "Hello, [name]" / "Hello, {name}" — the author's own names inside text.
    for (let s = 0; s < strings.length; s++) strings[s] = fillPlaceholders(strings[s], known);
    const cond = (r: string) => condition(r, known, renames, { textAsks, strings });

    // Lines written in another natural language belong to the built-in
    // translator, not to the agent — unless the agent recognises their
    // leading word, guessing at them would only mangle them.
    const firstWord = line.trim().split(/[\s(]+/)[0]?.toLowerCase() ?? '';
    if (/[^\x00-\x7F]/.test(line) && !ownWords.has(firstWord.replace(/[(:]$/, ''))) {
      unresolved.push(lineNo);
      return raw;
    }

    const statements = splitStatements(line);
    const rewritten: string[] = [];

    for (const original of statements) {
      // "I want ...", "please ...", "let's ..." — the sentence around the statement.
      const stmt = original.replace(FILLER_HEAD, '').trim() || original;
      const toks = wordsOf(stmt);
      if (!toks.length) continue;
      const head = toks[0];
      const headKey = head.toLowerCase().replace(/[(:]$/, '');
      let intent = words.get(headKey);
      const rest = stmt.slice(stmt.indexOf(head) + head.length).trim().replace(/^\(|\)$/g, '').trim();

      // Counting: "add 1 to score", "increase score by 2", "score++".
      const counted = counting(stmt);
      if (counted) {
        known.add(counted.name);
        rewritten.push(`set ${counted.name} to ${counted.name} ${counted.op} ${expression(counted.by, known, renames)}`);
        continue;
      }

      // "result is x + y" — a word the agent knows, used as the author's own name.
      const selfAssign = stmt.match(ASSIGN_SYMBOL_RE) ?? stmt.match(ASSIGN_RE);
      if (intent && selfAssign && selfAssign[1] === head && nameable(head)) intent = undefined;

      // "hungry is yes:" followed by an indented block — a question with no `if`.
      if (!intent && /[:{]\s*$/.test(stmt) && nextIndented(index) &&
          /\s(?:is|equals|==|!=|>|<|>=|<=)\s/i.test(' ' + stmt + ' ')) {
        rewritten.push(`if ${cond(stmt.replace(/[:{]\s*$/, ''))}`);
        continue;
      }


      // A call written in code — `result(5)`, `input()` — where the name is
      // something this file defines. That is already sdev: never reinterpret
      // the author's own names as keywords.
      const callBase = stmt.match(/^([\p{L}\p{N}_]+)\s*\(/u)?.[1];
      if (callBase && (known.has(callBase) || ctx.knownNames?.has(callBase))) {
        rewritten.push(stmt.replace(/[:{]\s*$/, '').trim());
        continue;
      }

      // closing brace / block end
      if (stmt === '}' || intent === 'end') { rewritten.push('end'); if (intent === 'end') learn(headKey, 'end'); continue; }

      switch (intent) {
        case 'say': {
          learn(headKey, 'say');
          // "say to terminal x", "print out x", "show on screen x"
          const what = rest.replace(SAY_TARGET, '').trim() || rest;
          rewritten.push(`say ${expression(what, known, renames)}`);
          continue;
        }
        case 'ask': {
          learn(headKey, 'ask');
          const form = parseAsk(stmt.slice(head.length));
          if (form) {
            known.add(form.name);
            rewritten.push(askValue(form.name, form.prompt));
            continue;
          }
          rewritten.push(rest ? `set ${rest.split(/\s+/)[0]} to input()` : 'input()');
          continue;
        }
        case 'set': {
          learn(headKey, 'set');
          const m = rest.match(ASSIGN_RE) ?? rest.match(ASSIGN_SYMBOL_RE);
          if (m) {
            const name = safeName(m[1]);
            if (name !== m[1]) renames.set(m[1], name);
            known.add(name);
            const asked = askRhs(m[2]);
            rewritten.push(asked !== undefined ? askValue(name, asked) : `set ${name} to ${expression(m[2], known, renames)}`);
            continue;
          }
          const parts = wordsOf(rest);
          if (parts.length >= 2) {
            known.add(parts[0]);
            const tail = parts.slice(1);
            if (/^(?:to|be|is|as|=|:=|<-|equals)$/i.test(tail[0])) tail.shift();
            rewritten.push(`set ${safeName(parts[0])} to ${expression(tail.join(' '), known, renames)}`);
            continue;
          }
          rewritten.push(stmt);
          continue;
        }
        case 'if':
          learn(headKey, 'if');
          rewritten.push(`if ${cond(rest)}`);
          continue;
        case 'else': {
          learn(headKey, 'else');
          const tail = rest.replace(/^[:{]\s*|[:{]\s*$/g, '').trim();
          rewritten.push(tail ? `else ${cond(tail)}` : 'else');
          continue;
        }
        case 'while':
          learn(headKey, 'while');
          rewritten.push(`while ${cond(rest)}`);
          continue;
        case 'for': {
          learn(headKey, 'for');
          const parts = wordsOf(rest).filter((t) => words.get(t.toLowerCase()) !== 'for');
          const at = parts.findIndex((t) => words.get(t.toLowerCase()) === 'in');
          if (at > 0) {
            const name = parts[at - 1];
            known.add(name);
            rewritten.push(`for each ${name} in ${parts.slice(at + 1).join(' ').replace(/[:{]\s*$/, '').trim()}`);
            continue;
          }
          rewritten.push(`for ${rest}`);
          continue;
        }
        case 'return':
          learn(headKey, 'return');
          rewritten.push(rest ? `return ${expression(rest.replace(/^(?:back|the|a|value|of)\s+/i, ''), known, renames)}` : 'return');
          continue;
        case 'break':
        case 'continue':
          learn(headKey, intent);
          rewritten.push(CANONICAL[intent]);
          continue;
        case 'function': {
          learn(headKey, 'function');
          const cleanedDecl = rest.replace(/[:{]\s*$/, '').replace(DECL_NOISE, ' ').replace(/\s+/g, ' ').trim();
          const parts = wordsOf(cleanedDecl);
          if (!parts.length) { rewritten.push(stmt); continue; }
          const rawName = parts[0].replace(/\(.*$/, '');
          const name = safeName(rawName);
          if (name !== rawName) renames.set(rawName, name);
          const inParens = parts[0].includes('(') ? [parts[0].slice(parts[0].indexOf('('))] : [];
          const params = [...inParens, ...parts.slice(1)]
            .join(' ')
            .replace(/^\(|\)$/g, '')
            .replace(/,/g, ' ')
            .split(/\s+/)
            .filter((p) => p && words.get(p.toLowerCase()) !== 'in' && p !== 'with')
            .map((p) => {
              const safe = safeName(p);
              if (safe !== p) renames.set(p, safe);
              return safe;
            });
          known.add(name);
          params.forEach((p) => known.add(p));
          rewritten.push(params.length ? `to ${name} with ${params.join(' ')}` : `to ${name}`);
          continue;
        }
        default:
          break;
      }

      // assignment without a leading verb: `name1 will be Twenty`
      const assign = stmt.match(ASSIGN_SYMBOL_RE) ?? stmt.match(ASSIGN_RE);
      if (assign && nameable(assign[1])) {
        const name = safeName(assign[1]);
        if (name !== assign[1]) renames.set(assign[1], name);
        known.add(name);
        const asked = askRhs(assign[2]);
        rewritten.push(asked !== undefined ? askValue(name, asked) : `set ${name} to ${expression(assign[2], known, renames)}`);
        continue;
      }

      // "call 11 with 2", "run greet with \"sam\"", "do greet"
      if (/^(?:call|run|do|invoke|execute|use)$/i.test(headKey) && toks.length >= 2) {
        const target = safeName(toks[1]);
        const args = wordsOf(rest)
          .slice(1)
          .filter((t) => !/^(?:with|and|using|,)$/i.test(t))
          .map((t) => (renames.get(t) ?? t).replace(/,$/, ''));
        rewritten.push(`${target}(${args.join(', ')})`);
        continue;
      }

      // a bare call or an already-canonical line
      if (/^[\p{L}\p{N}_]+\s*\(/u.test(stmt) || RESERVED.has(headKey) || known.has(head) || BUILTINS.has(headKey)) {
        rewritten.push(stmt.replace(/[:{]\s*$/, '').trim());
        continue;
      }

      if (ctx.strict) { rewritten.push(stmt); unresolved.push(lineNo); continue; }

      // Last resort: a lone unknown word on its own line is almost always
      // meant to be shown.
      if (toks.length === 1 && !isMaskedString(toks[0])) {
        rewritten.push(`say "${toks[0]}"`);
        continue;
      }
      rewritten.push(stmt);
      unresolved.push(lineNo);
    }

    const joined = rewritten.join('\n' + indent);
    const result = indent + unmask(joined, strings) + comment;
    note(lineNo, raw, result, 'understood as canonical sdev');
    return result;
  });

  return { source: out.join('\n'), notes, learned, unresolved, changed };
}

const OPENS = /^\s*(?:to\s+[\p{L}\p{N}_]|if\b|while\b|for\s+each\b|kind\b|attempt\b|match\b)/u;
const CLOSES = /^\s*end\b/;

/**
 * People often never write `end`. Close what they left open: an indented
 * block closes as soon as the code steps back out to its level (or at a blank
 * line followed by a shallower line), and anything still open is closed at
 * the end of the file. Flat files that write their own `end` are untouched.
 */
export function closeBlocks(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  const stack: { indent: string; body: boolean }[] = [];
  const width = (s: string) => s.match(/^\s*/)?.[0].length ?? 0;
  const top = () => stack[stack.length - 1];

  const nextCode = (from: number) => {
    for (let j = from; j < lines.length; j++) if (lines[j].trim()) return lines[j];
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      const next = nextCode(i + 1);
      while (
        stack.length &&
        next !== null &&
        !/^\s*(?:else|end)\b/.test(next) &&
        width(next) <= top().indent.length
      ) {
        out.push(stack.pop()!.indent + 'end');
      }
      out.push(line);
      continue;
    }
    const w = width(line);
    const continues = /^\s*(?:else|end)\b/.test(line);
    // stepping back out of an indented body closes it
    while (stack.length && top().body && w <= top().indent.length && !(continues && w === top().indent.length)) {
      out.push(stack.pop()!.indent + 'end');
    }
    if (stack.length && w > top().indent.length) top().body = true;
    if (CLOSES.test(line)) stack.pop();
    else if (/^\s*else\b/.test(line) && stack.length) top().body = false;
    else if (OPENS.test(line)) stack.push({ indent: line.match(/^\s*/)?.[0] ?? '', body: false });
    out.push(line);
  }
  while (stack.length) out.push(stack.pop()!.indent + 'end');
  return out.join('\n');
}
