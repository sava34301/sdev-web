/**
 * Text-tooling primitives. Added so programs that read and rewrite code —
 * starting with the self-hosted understander (lang/agent/understander.sdev) —
 * can be written in sdev itself. Mirrored in the Python interpreter.
 */
import { SdevFunction, OutputCallback } from './utils';
import { SdevError } from '../errors';

function text(v: unknown, fn: string, line: number): string {
  if (typeof v !== 'string') throw new SdevError(`${fn}() expects text`, line);
  return v;
}

function flagsOf(v: unknown, global: boolean): string {
  const f = typeof v === 'string' ? v.replace(/[^imsu]/g, '') : '';
  return (global ? 'g' : '') + (f.includes('u') ? f : f + 'u');
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
  def('regex_test', (a, l) => new RegExp(text(a[1], 'regex_test', l), flagsOf(a[2], false)).test(text(a[0], 'regex_test', l)));
  def('regex_capture', (a, l) => {
    const m = text(a[0], 'regex_capture', l).match(new RegExp(text(a[1], 'regex_capture', l), flagsOf(a[2], false)));
    return m ? Array.from(m, (x) => x ?? '') : null;
  });
  def('regex_find_all', (a, l) =>
    Array.from(text(a[0], 'regex_find_all', l).matchAll(new RegExp(text(a[1], 'regex_find_all', l), flagsOf(a[2], true))), (m) => m[0]));
  def('regex_replace', (a, l) =>
    text(a[0], 'regex_replace', l).replace(new RegExp(text(a[1], 'regex_replace', l), flagsOf(a[3], true)), text(a[2], 'regex_replace', l)));
  def('quote_text', (a, l) => JSON.stringify(text(a[0], 'quote_text', l)));
}
