/**
 * The canonicalizer.
 *
 * Forward:  dialect source  ->  canonical sdev v2 source (what the untouched
 *           self-hosted lexer/parser/codegen compiles).
 * Reverse:  canonical source -> any dialect's surface.
 *
 * Both directions are driven by the same spec, which is what makes
 * translation between two dialects lossless: reverse(forward(x)).
 *
 * Comments and string contents are never rewritten.
 */
import type { DialectSpec } from './spec';
import { DEFAULT_STYLE, preludeSource } from './spec';
import { CATALOG_WORDS } from './catalog';
import { getDialectRunner } from './dialect-runner';

type Seg = { kind: 'code' | 'string' | 'comment'; text: string };

function splitLine(line: string, commentMarker: string): Seg[] {
  const raw = getDialectRunner().call('dialect_split_line', line, commentMarker) as Array<['code' | 'string' | 'comment', string]>;
  return raw.map(([kind, text]) => ({ kind, text }));
}

function mapWords(code: string, dict: Map<string, string>): string {
  const dictObj: Record<string, string> = {};
  for (const [k, v] of dict) dictObj[k] = v;
  return getDialectRunner().callStr('dialect_map_words', code, dictObj);
}

function forwardDict(spec: DialectSpec): Map<string, string> {
  const dict = new Map<string, string>();
  for (const canonical of CATALOG_WORDS) {
    const word = spec.names[canonical] ?? canonical;
    dict.set(word, canonical);
    for (const syn of spec.synonyms[canonical] ?? []) dict.set(syn, canonical);
  }
  return dict;
}

function reverseDict(spec: DialectSpec): Map<string, string> {
  const dict = new Map<string, string>();
  for (const canonical of CATALOG_WORDS) {
    const word = spec.names[canonical] ?? canonical;
    if (word !== canonical) dict.set(canonical, word);
  }
  return dict;
}

export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `a <sym> b` -> `fn(a, b)` for user-declared operators. */
function desugarOperators(code: string, spec: DialectSpec): string {
  let out = code;
  const ops = [...spec.constructs.operators].sort((a, b) => b.symbol.length - a.symbol.length);
  const atom = String.raw`(?:[\p{L}\p{N}_]+(?:\([^()]*\))?|"[^"]*")`;
  for (const op of ops) {
    const re = new RegExp(`(${atom})\\s*${escapeRe(op.symbol)}\\s*(${atom})`, 'gu');
    for (let pass = 0; pass < 8; pass++) {
      const next = out.replace(re, (_m, a, b) => `${op.fn}(${a}, ${b})`);
      if (next === out) break;
      out = next;
    }
  }
  return out;
}

function rewriteAssignmentForward(code: string, spec: DialectSpec): string {
  const form = spec.style.assignment;
  if (form === 'equals') {
    return code.replace(
      /^(\s*)([\p{L}\p{N}_]+)\s*=\s*(?!=)(.+)$/u,
      (_m, ws, name, rhs) => `${ws}set ${name} to ${rhs}`,
    );
  }
  if (form === 'arrow') {
    return code.replace(
      /^(\s*)(.+?)\s*->\s*([\p{L}\p{N}_]+)\s*$/u,
      (_m, ws, rhs, name) => `${ws}set ${name} to ${rhs}`,
    );
  }
  return code;
}

function rewriteAssignmentReverse(code: string, spec: DialectSpec): string {
  const form = spec.style.assignment;
  const m = code.match(/^(\s*)set\s+([\p{L}\p{N}_]+)\s+to\s+(.+)$/u);
  if (!m) return code;
  const [, ws, name, rhs] = m;
  if (form === 'equals') return `${ws}${name} = ${rhs}`;
  if (form === 'arrow') return `${ws}${rhs} -> ${name}`;
  return code;
}

export interface CanonicalizeResult {
  source: string;
  /** the dialect prelude prepended, if any */
  prelude: string;
}

const PLACEHOLDER = '\u0000';

/** Replace strings with placeholders so line-level rules never touch literals. */
function mask(segs: Seg[]): { line: string; strings: string[]; comment: string | null } {
  const strings: string[] = [];
  let comment: string | null = null;
  let line = '';
  for (const seg of segs) {
    if (seg.kind === 'string') {
      line += `${PLACEHOLDER}${strings.length}${PLACEHOLDER}`;
      strings.push(seg.text);
    } else if (seg.kind === 'comment') {
      comment = seg.text;
    } else {
      line += seg.text;
    }
  }
  return { line, strings, comment };
}

function unmask(line: string, strings: string[]): string {
  return line.replace(/\u0000(\d+)\u0000/g, (_m, i) => strings[Number(i)]);
}

const BLOCK_OPENERS = /^\s*(if|else|for|while|to|kind|does|attempt|rescue|make)\b/;

/** dialect surface -> canonical sdev v2. */
export function canonicalize(source: string, spec: DialectSpec, opts: { withPrelude?: boolean } = {}): CanonicalizeResult {
  const marker = spec.style.commentMarker || DEFAULT_STYLE.commentMarker;
  const dict = forwardDict(spec);
  const braces = spec.style.blockStyle === 'braces';

  const lines = source.split('\n').map((raw) => {
    const { line, strings, comment } = mask(splitLine(raw, marker));
    let code = mapWords(line, dict);
    if (spec.constructs.operators.length) code = desugarOperators(code, spec);
    if (braces) code = code.replace(/\s*\{\s*$/, '').replace(/^(\s*)\}\s*$/, '$1end');
    code = rewriteAssignmentForward(code, spec);
    const canonicalComment = comment === null ? '' : '#' + comment.slice(marker.length);
    return (unmask(code, strings) + canonicalComment).replace(/\s+$/, '');
  });

  const prelude = opts.withPrelude === false ? '' : preludeSource(spec);
  const body = lines.join('\n');
  return { source: prelude ? `${prelude}\n${body}` : body, prelude };
}

/** canonical sdev v2 -> a dialect's surface. */
export function dialectize(source: string, spec: DialectSpec): string {
  const marker = spec.style.commentMarker || DEFAULT_STYLE.commentMarker;
  const dict = reverseDict(spec);
  const braces = spec.style.blockStyle === 'braces';

  return source
    .split('\n')
    .map((raw) => {
      const { line, strings, comment } = mask(splitLine(raw, '#'));
      let code = rewriteAssignmentReverse(line, spec);
      if (braces) {
        if (/^\s*end\s*$/.test(code)) code = code.replace(/^(\s*)end\s*$/, '$1}');
        else if (BLOCK_OPENERS.test(code)) code = `${code.replace(/\s+$/, '')} {`;
      }
      code = mapWords(code, dict);
      const dialectComment = comment === null ? '' : marker + comment.slice(1);
      return (unmask(code, strings) + dialectComment).replace(/\s+$/, '');
    })
    .join('\n');
}

/** Translate straight from one dialect to another. */
export function translateDialect(source: string, from: DialectSpec, to: DialectSpec): string {
  return dialectize(canonicalize(source, from, { withPrelude: false }).source, to);
}

