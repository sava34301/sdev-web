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

type Seg = { kind: 'code' | 'string' | 'comment'; text: string };

function splitLine(line: string, commentMarker: string): Seg[] {
  const segs: Seg[] = [];
  let buf = '';
  let i = 0;
  const flush = () => { if (buf) { segs.push({ kind: 'code', text: buf }); buf = ''; } };
  while (i < line.length) {
    const c = line[i];
    if (commentMarker && line.startsWith(commentMarker, i)) {
      flush();
      segs.push({ kind: 'comment', text: line.slice(i) });
      return segs;
    }
    if (c === '"' || c === "'") {
      flush();
      const quote = c;
      let s = c;
      i++;
      while (i < line.length) {
        if (line[i] === '\\' && i + 1 < line.length) { s += line[i] + line[i + 1]; i += 2; continue; }
        s += line[i];
        if (line[i] === quote) { i++; break; }
        i++;
      }
      segs.push({ kind: 'string', text: s });
      continue;
    }
    buf += c;
    i++;
  }
  flush();
  return segs;
}

const WORD_SPLIT = /([\p{L}\p{N}_]+)/u;

function mapWords(code: string, dict: Map<string, string>): string {
  return code
    .split(WORD_SPLIT)
    .map((part, idx) => (idx % 2 === 1 ? dict.get(part) ?? part : part))
    .join('');
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

function escapeRe(s: string): string {
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

/** dialect surface -> canonical sdev v2. */
export function canonicalize(source: string, spec: DialectSpec, opts: { withPrelude?: boolean } = {}): CanonicalizeResult {
  const marker = spec.style.commentMarker || DEFAULT_STYLE.commentMarker;
  const dict = forwardDict(spec);
  const braces = spec.style.blockStyle === 'braces';

  const lines = source.split('\n').map((line) => {
    const segs = splitLine(line, marker);
    return segs
      .map((seg) => {
        if (seg.kind === 'string') return seg.text;
        if (seg.kind === 'comment') return '#' + seg.text.slice(marker.length);
        let code = mapWords(seg.text, dict);
        if (spec.constructs.operators.length) code = desugarOperators(code, spec);
        if (braces) code = code.replace(/\{\s*$/, '').replace(/^(\s*)\}\s*$/, '$1end');
        code = rewriteAssignmentForward(code, spec);
        return code;
      })
      .join('')
      .replace(/\s+$/, '');
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
    .map((line) => {
      const segs = splitLine(line, '#');
      return segs
        .map((seg) => {
          if (seg.kind === 'string') return seg.text;
          if (seg.kind === 'comment') return marker + seg.text.slice(1);
          let code = rewriteAssignmentReverse(seg.text, spec);
          if (braces) code = code.replace(/^(\s*)end\s*$/, '$1}');
          return mapWords(code, dict);
        })
        .join('')
        .replace(/\s+$/, '');
    })
    .join('\n');
}

/** Translate straight from one dialect to another. */
export function translateDialect(source: string, from: DialectSpec, to: DialectSpec): string {
  return dialectize(canonicalize(source, from, { withPrelude: false }).source, to);
}
