// SDEV v2 "Prism" — shared lexer and error class.

export const KEYWORDS = new Set([
  'say', 'ask', 'set', 'to', 'if', 'else', 'end', 'for', 'each', 'in',
  'while', 'return', 'with', 'true', 'false', 'nothing', 'is', 'not',
  'and', 'or', 'more', 'less', 'match',
]);

export class SdevError extends Error {
  constructor(msg, line) {
    super(`[sdev v2] line ${line ?? '?'}: ${msg}`);
    this.line = line;
  }
}

export function tokenize(src) {
  const tokens = [];
  let i = 0, line = 1, col = 1;
  const push = (type, value) => tokens.push({ type, value, line, col });

  while (i < src.length) {
    const c = src[i];

    // Newlines act as statement terminators in v2.
    if (c === '\n') { push('NL', '\n'); i++; line++; col = 1; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; col++; continue; }
    if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }

    if (/[0-9]/.test(c)) {
      let s = '';
      while (i < src.length && /[0-9.]/.test(src[i])) { s += src[i++]; col++; }
      tokens.push({ type: 'NUM', value: parseFloat(s), line, col, isFloat: s.includes('.') });
      continue;
    }

    if (c === '"' || c === "'") {
      const quote = c; i++; col++;
      let s = '';
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\' && i + 1 < src.length) {
          const n = src[i + 1];
          s += n === 'n' ? '\n' : n === 't' ? '\t' : n === '\\' ? '\\' : n === quote ? quote : n;
          i += 2; col += 2;
        } else {
          if (src[i] === '\n') { line++; col = 0; }
          s += src[i++]; col++;
        }
      }
      i++; col++;
      push('STR', s); continue;
    }

    // Unicode letters + _, matching lang/compiler/lexer.sdev.
    if (/[\p{L}_]/u.test(c)) {
      let s = '';
      while (i < src.length && /[\p{L}\p{N}_]/u.test(src[i])) { s += src[i++]; col++; }
      if (KEYWORDS.has(s)) push('KW', s);
      else if (s === 'yep' || s === 'nope') push('KW', s === 'yep' ? 'true' : 'false');
      else push('IDENT', s);
      continue;
    }

    if (c === '|' && src[i + 1] === '>') { push('OP', '|>'); i += 2; col += 2; continue; }
    if (c === '<' && src[i + 1] === '=') { push('OP', '<='); i += 2; col += 2; continue; }
    if (c === '>' && src[i + 1] === '=') { push('OP', '>='); i += 2; col += 2; continue; }
    if (c === '-' && src[i + 1] === '>') { push('OP', '->'); i += 2; col += 2; continue; }

    if ('+-*/%(),[]{}:.<>|'.includes(c)) {
      push('OP', c); i++; col++; continue;
    }

    throw new SdevError(`Unexpected character '${c}'`, line);
  }
  push('EOF', null);
  return tokens;
}
