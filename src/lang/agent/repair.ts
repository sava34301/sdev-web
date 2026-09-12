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
function expression(rest: string, known: Set<string>): string {
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

function condition(rest: string, known: Set<string>): string {
  let out = ' ' + rest.trim() + ' ';
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
  for (const [w, i] of ctx.extraWords ?? []) words.set(w.toLowerCase(), i);

  const rawLines = source.split('\n');
  const known = collectNames(rawLines, words, ctx.knownNames);
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

    const statements = splitStatements(line);
    const rewritten: string[] = [];

    for (const stmt of statements) {
      const toks = wordsOf(stmt);
      if (!toks.length) continue;
      const head = toks[0];
      const headKey = head.toLowerCase().replace(/[(:]$/, '');
      const intent = words.get(headKey);
      const rest = stmt.slice(stmt.indexOf(head) + head.length).trim().replace(/^\(|\)$/g, '').trim();

      // closing brace / block end
      if (stmt === '}' || intent === 'end') { rewritten.push('end'); if (intent === 'end') learn(headKey, 'end'); continue; }

      switch (intent) {
        case 'say':
          learn(headKey, 'say');
          rewritten.push(`say ${expression(rest, known)}`);
          continue;
        case 'ask':
          learn(headKey, 'ask');
          rewritten.push(rest ? `set ${rest.split(/\s+/)[0]} to ask` : 'ask');
          continue;
        case 'set': {
          learn(headKey, 'set');
          const m = rest.match(ASSIGN_RE) ?? rest.match(ASSIGN_SYMBOL_RE);
          if (m) { known.add(m[1]); rewritten.push(`set ${m[1]} to ${expression(m[2], known)}`); continue; }
          const parts = wordsOf(rest);
          if (parts.length >= 2) {
            known.add(parts[0]);
            const tail = parts.slice(1);
            if (/^(?:to|be|is|as|=|:=|<-|equals)$/i.test(tail[0])) tail.shift();
            rewritten.push(`set ${parts[0]} to ${expression(tail.join(' '), known)}`);
            continue;
          }
          rewritten.push(stmt);
          continue;
        }
        case 'if':
          learn(headKey, 'if');
          rewritten.push(`if ${condition(rest, known)}`);
          continue;
        case 'else':
          learn(headKey, 'else');
          rewritten.push(rest ? `else ${condition(rest, known)}`.replace(/^else if/, 'else if') : 'else');
          continue;
        case 'while':
          learn(headKey, 'while');
          rewritten.push(`while ${condition(rest, known)}`);
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
          rewritten.push(rest ? `return ${expression(rest.replace(/^(?:back|the|a|value|of)\s+/i, ''), known)}` : 'return');
          continue;
        case 'break':
        case 'continue':
          learn(headKey, intent);
          rewritten.push(CANONICAL[intent]);
          continue;
        case 'function': {
          learn(headKey, 'function');
          const parts = wordsOf(rest.replace(/[:{]\s*$/, ''));
          if (!parts.length) { rewritten.push(stmt); continue; }
          const name = parts[0].replace(/\(.*$/, '');
          const inParens = parts[0].includes('(') ? [parts[0].slice(parts[0].indexOf('('))] : [];
          const params = [...inParens, ...parts.slice(1)]
            .join(' ')
            .replace(/^\(|\)$/g, '')
            .replace(/,/g, ' ')
            .split(/\s+/)
            .filter((p) => p && words.get(p.toLowerCase()) !== 'in' && p !== 'with');
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
        known.add(assign[1]);
        rewritten.push(`set ${assign[1]} to ${expression(assign[2], known)}`);
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
