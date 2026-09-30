/** Everyday plain-sentence requests, understood offline. Run: bun scripts/test-tasks.ts */
import { execute } from '@/lang';
const cases: [string, string | RegExp][] = [
  ['count from 1 to 5', '1|2|3|4|5'], ['count to 3', '1|2|3'], ['count down from 3', '3|2|1'],
  ['print numbers from 10 to 7', '10|9|8|7'], ['count from 0 to 10 by 5', '0|5|10'],
  ['say hi 3 times', 'hi|hi|hi'], ['print "Hello there" 2 times', 'Hello there|Hello there'], ['repeat yes two times', 'yes|yes'],
  ['reverse hello', 'olleh'], ['reverse the word "banana"', 'ananab'], ['make banana uppercase', 'BANANA'],
  ['make HELLO lowercase', 'hello'], ['how many letters in apple', '5'], ['length of "hello"', '5'],
  ['is 7 even', 'odd'], ['is 10 even or odd', 'even'], ['random number between 4 and 4', '4'],
  ['roll a die', /^[1-6]$/], ['flip a coin', /^(heads|tails)$/],
  ['sort 5, 2, 9', '[2, 5, 9]'], ['sort 5, 2, 9 from biggest to smallest', '[9, 5, 2]'],
  ['multiplication table of 2', /^2 x 1 = 2\|.*\|2 x 10 = 20$/], ['say hello to Sam', 'Hello, Sam'], ['greet Maria', 'Hello, Maria'],
  ['please count to 2', '1|2'], ['set word to "abc"\nreverse word', 'cba'],
  ['for i in sequence(1, 4)\n  say i\nend', '1|2|3'],
  // regressions: real code is left alone
  ['set x to 2\nsay x', '2'], ['say 7 * 8', '56'], ['score is 0\nadd 1 to score\nsay score', '1'],
  ['to add with a b\n  return a + b\nend\nsay add(2, 3)', '5'],
];
let pass = 0, fail = 0;
for (const [src, want] of cases) {
  const r = execute(src);
  const got = r.output.join('|');
  const ok = r.success && (typeof want === 'string' ? got === want : want.test(got));
  if (ok) { pass++; console.log('  ok  ', JSON.stringify(src)); }
  else { fail++; console.log('  FAIL', JSON.stringify(src), 'got', JSON.stringify(got), r.error ?? ''); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
