/**
 * Parser rules for words and strings that must stay as written.
 * Run: node scripts/run-ts.mjs scripts/test-parser-literals.ts
 */
import { execute } from '@/lang';
import { Lexer } from '@/lang/lexer';
import { Parser } from '@/lang/parser';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log('  ok  ', name); }
  else { fail++; console.log('  FAIL', name, detail); }
};
const run = (src: string) => execute(src);
const parses = (src: string) => {
  try { new Parser(new Lexer(src).tokenize()).parse(); return true; } catch { return false; }
};

// `val` and `const` stay usable as ordinary names.
{
  const r = run('forge val be 3\nspeak(val + 1)');
  check('val as a variable name', r.success && r.output.join('|') === '4', JSON.stringify(r));
}
{
  const r = run('forge const be 7\nspeak(const)');
  check('const as a variable name', r.success && r.output.join('|') === '7', JSON.stringify(r));
}
{
  const r = run('conjure f(st, name, val)\n  yield val * 2\n;;\nspeak(f(1, 2, 5))');
  check('val as a parameter name', r.success && r.output.join('|') === '10', JSON.stringify(r));
}
check('val be 5 is an assignment', parses('forge val be 1\nval be 5'));

// `fixed x be ...` still declares a constant that cannot be reassigned.
{
  const r = run('fixed limit be 10\nspeak(limit)');
  check('fixed declares a constant', r.success && r.output.join('|') === '10', JSON.stringify(r));
}
{
  const r = run('fixed limit be 10\nlimit be 11');
  check('fixed constant cannot be reassigned', !r.success, JSON.stringify(r));
}

// Plain strings keep their braces literally; only f"..." interpolates.
{
  const r = run(`speak('{"a": 1}')`);
  check('JSON text stays literal', r.success && r.output.join('|') === '{"a": 1}', JSON.stringify(r));
}
{
  const r = run('speak("\\\\d{3}")');
  check('regex quantifier stays literal', r.success && r.output.join('|') === '\\d{3}', JSON.stringify(r));
}
{
  const r = run('speak("\\\\p{L}")');
  check('\\p{L} stays literal', r.success && r.output.join('|') === '\\p{L}', JSON.stringify(r));
}
{
  const r = run('speak("{{x}}")');
  check('doubled braces stay doubled', r.success && r.output.join('|') === '{{x}}', JSON.stringify(r));
}
{
  const r = run('forge n be 4\nspeak(f"n={n}")');
  check('f-strings still interpolate', r.success && r.output.join('|') === 'n=4', JSON.stringify(r));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
