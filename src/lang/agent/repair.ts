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
const DECL_NOISE = /\b(?:called|named|name|a|an|the|new|variable|variables|parameter|parameters|argument|arguments|input|inputs|that|which|takes|taking|accepts|of|value)\b/gi;
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
  const numeric = numberWord(tokens.join(' '));
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

  if (understood) return tokens.join(' ');

  // Bare words the file never introduced: the user meant text.
  const words = tokens.map((t) => (isMaskedString(t) ? t : t));
  if (words.length === 1 && !isMaskedString(words[0]) && numberWord(words[0]) !== null) {
    return numberWord(words[0])!;
  }
  const allBare = tokens.every((t) => !isMaskedString(t));
  if (allBare) return '"' + tokens.join(' ').replace(/"/g, '\\"') + '"';

  // mixed: quote only the unknown runs
  return tokens
    .map((t) => (isMaskedString(t) || /^[\d.]+$/.test(t) || known.has(t) || RESERVED.has(t) || BUILTINS.has(t) || /[(.[]/.test(t)
      ? t
      : '"' + t + '"'))
    .join(' + ');
}

function condition(rest: string, known: Set<string>, renames?: Map<string, string>): string {
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
  // stray number words inside the condition
  out = out
    .split(' ')
    .map((t) => (!isMaskedString(t) && numberWord(t) !== null ? numberWord(t)! : t))
    .join(' ');
  void known;
  return out;
}

const ASSIGN_RE = new RegExp(
  `^([\\p{L}\\p{N}_]+)\\s+(?:${ASSIGN_PHRASES.filter((p) => /^[a-zа-я ]+$/i.test(p))
    .sort((a, b) => b.length - a.length)
    .join('|')})\\s+(.+)$`,
  'iu',
);
const ASSIGN_SYMBOL_RE = /^([\p{L}\p{N}_]+)\s*(?::=|<-|=(?!=))\s*(.+)$/u;

/** Collect the names the file introduces, so bare words can be told apart. */
function collectNames(lines: string[], words: Map<string, Intent>, seed?: Set<string>): Set<string> {
  const names = new Set<string>(seed ?? []);
  for (const raw of lines) {
    const { line } = mask(raw);
    for (const stmt of splitStatements(line)) {
      const toks = wordsOf(stmt);
      if (!toks.length) continue;
      const head = words.get(toks[0].toLowerCase());
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
      const m = stmt.match(ASSIGN_RE) ?? stmt.match(ASSIGN_SYMBOL_RE);
      if (m && !words.has(m[1].toLowerCase())) names.add(m[1]);
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
      const intent = words.get(headKey);
      const rest = stmt.slice(stmt.indexOf(head) + head.length).trim().replace(/^\(|\)$/g, '').trim();

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
        case 'ask':
          learn(headKey, 'ask');
          rewritten.push(rest ? `set ${rest.split(/\s+/)[0]} to ask` : 'ask');
          continue;
        case 'set': {
          learn(headKey, 'set');
          const m = rest.match(ASSIGN_RE) ?? rest.match(ASSIGN_SYMBOL_RE);
          if (m) {
            const name = safeName(m[1]);
            if (name !== m[1]) renames.set(m[1], name);
            known.add(name);
            rewritten.push(`set ${name} to ${expression(m[2], known, renames)}`);
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
          rewritten.push(`if ${condition(rest, known, renames)}`);
          continue;
        case 'else':
          learn(headKey, 'else');
          rewritten.push(rest ? `else ${condition(rest, known)}`.replace(/^else if/, 'else if') : 'else');
          continue;
        case 'while':
          learn(headKey, 'while');
          rewritten.push(`while ${condition(rest, known, renames)}`);
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
      const assign = stmt.match(ASSIGN_RE) ?? stmt.match(ASSIGN_SYMBOL_RE);
      if (assign && !words.has(assign[1].toLowerCase())) {
        const name = safeName(assign[1]);
        if (name !== assign[1]) renames.set(assign[1], name);
        known.add(name);
        rewritten.push(`set ${name} to ${expression(assign[2], known, renames)}`);
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
