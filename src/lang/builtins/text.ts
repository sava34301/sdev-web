/**
 * Text-tooling primitives. Added so programs that read and rewrite code —
 * starting with the self-hosted understander (lang/agent/understander.sdev) —
 * can be written in sdev itself. Mirrored in the Python interpreter.
 */
import { SdevFunction, OutputCallback } from './utils';
import { SdevError } from '../errors';
import { regexProblem } from './regex-guard';

function text(v: unknown, fn: string, line: number): string {
  if (typeof v !== 'string') throw new SdevError(`${fn}() expects text`, line);
  return v;
}

function flagsOf(v: unknown, global: boolean): string {
  const f = typeof v === 'string' ? v.replace(/[^imsu]/g, '') : '';
  return (global ? 'g' : '') + (f.includes('u') ? f : f + 'u');
}

const cache = new Map<string, RegExp>();
function re(p: string, f: string, t?: string, line = 0): RegExp {
  const bad = regexProblem(p, t ?? '');
  if (bad) throw new SdevError(bad, line);
  const k = f + '/' + p;
  let r = cache.get(k);
  if (!r) { r = new RegExp(p, f); if (cache.size > 500) cache.clear(); cache.set(k, r); }
  r.lastIndex = 0;
  return r;
}

export function registerText(builtins: Map<string, SdevFunction>, _output: OutputCallback): void {
  const def = (name: string, call: (args: unknown[], line: number) => unknown) =>
    builtins.set(name, { type: 'builtin', call });

  def('lines', (a, l) => text(a[0], 'lines', l).split(/\r?\n/));
  def('unlines', (a, l) => {
    if (!Array.isArray(a[0])) throw new SdevError('unlines() expects a list', l);
    return a[0].map((x) => (typeof x === 'string' ? x : String(x))).join('\n');
  });
  def('words', (a, l) => text(a[0], 'words', l).split(/\s+/).filter(Boolean));
  def('char_at', (a, l) => text(a[0], 'char_at', l)[Number(a[1])] ?? '');
  def('code_at', (a, l) => {
    const s = text(a[0], 'code_at', l);
    const c = s.codePointAt(Number(a[1]));
    return c === undefined ? -1 : c;
  });
  def('find_from', (a, l) => text(a[0], 'find_from', l).indexOf(text(a[1], 'find_from', l), Number(a[2] ?? 0)));
  def('find_last', (a, l) => text(a[0], 'find_last', l).lastIndexOf(text(a[1], 'find_last', l)));
  def('leading_space', (a, l) => text(a[0], 'leading_space', l).match(/^\s*/)![0]);
  def('is_letter', (a, l) => /^\p{L}+$/u.test(text(a[0], 'is_letter', l)));
  def('is_digit', (a, l) => /^[0-9]+$/.test(text(a[0], 'is_digit', l)));
  def('is_space', (a, l) => /^\s+$/.test(text(a[0], 'is_space', l)));
  def('is_name', (a, l) => /^[\p{L}_][\p{L}\p{N}_]*$/u.test(text(a[0], 'is_name', l)));

  // Regular expressions with optional flags ("i", "m", "s").
  const rx = (a: unknown[], fn: string, flagIdx: number, global: boolean, l: number) => {
    const t = text(a[0], fn, l);
    return { t, r: re(text(a[1], fn, l), flagsOf(a[flagIdx], global), t, l) };
  };
  def('regex_test', (a, l) => { const { t, r } = rx(a, 'regex_test', 2, false, l); return r.test(t); });
  def('regex_capture', (a, l) => {
    const { t, r } = rx(a, 'regex_capture', 2, false, l);
    const m = t.match(r);
    return m ? Array.from(m, (x) => x ?? '') : null;
  });
  def('regex_find_all', (a, l) => { const { t, r } = rx(a, 'regex_find_all', 2, true, l); return Array.from(t.matchAll(r), (m) => m[0]); });
  def('regex_replace', (a, l) => {
    const { t, r } = rx(a, 'regex_replace', 3, true, l);
    return t.replace(r, text(a[2], 'regex_replace', l));
  });
  // evaluate("2 + 3 * (4 - 1)") — safe arithmetic on text (calculators, forms)
  def('evaluate', (a, l) => {
    const src = text(a[0], 'evaluate', l).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    let i = 0;
    const peek = () => { while (src[i] === ' ') i++; return src[i]; };
    const fail = (): never => { throw new SdevError(`evaluate(): cannot read "${src}"`, l); };
    const atom = (): number => {
      const c = peek();
      if (c === '(') { i++; const v = sum(); if (peek() !== ')') fail(); i++; return v; }
      if (c === '-') { i++; return -atom(); }
      if (c === '+') { i++; return atom(); }
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m) fail();
      i += m![0].length;
      let v = Number(m![0]);
      if (peek() === '%') { i++; v /= 100; }
      return v;
    };
    const power = (): number => { const b = atom(); if (peek() === '^' || src.startsWith('**', i)) { i += src[i] === '^' ? 1 : 2; return b ** power(); } return b; };
    const product = (): number => {
      let v = power();
      for (;;) {
        const c = peek();
        if (c === '*' && src[i + 1] !== '*') { i++; v *= power(); }
        else if (c === '/') { i++; v /= power(); }
        else if (c === '%') { i++; v %= power(); }
        else return v;
      }
    };
    const sum = (): number => {
      let v = product();
      for (;;) {
        const c = peek();
        if (c === '+') { i++; v += product(); } else if (c === '-') { i++; v -= product(); } else return v;
      }
    };
    const v = sum();
    if (peek() !== undefined) fail();
    return Math.round(v * 1e12) / 1e12;
  });
  def('quote_text', (a, l) => JSON.stringify(text(a[0], 'quote_text', l)));
}
