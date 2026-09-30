/**
 * Free-form requests through the whole agent, including the online AI brain.
 * Needs internet. Run: bun scripts/test-brain.ts
 */
import { executeAsync } from '@/lang';
import { setMemoryStore, emptyMemory } from '@/lang/agent/index';
let mem = emptyMemory();
setMemoryStore({ load: () => mem, save: (m) => { mem = m; } });

type Case = [string, (out: string[]) => boolean];
const has = (...parts: string[]) => (o: string[]) => parts.every((p) => o.join('\n').toLowerCase().includes(p.toLowerCase()));
const cases: Case[] = [
  ['calculate the area of a circle with radius 2', (o) => /12\.56/.test(o.join(' '))],
  ['make a shopping list with milk, eggs and bread and print it sorted', (o) => /bread[\s\S]*eggs[\s\S]*milk/i.test(o.join('\n'))],
  ['print every even number between 1 and 10', has('2', '4', '6', '8', '10')],
  ['convert 100 celsius to fahrenheit', has('212')],
  ['find the biggest number in 4, 17, 9 and 12', has('17')],
  ['write a function that doubles a number and use it on 21', has('42')],
  ['check if racecar is a palindrome', (o) => /yes|true|yep|palindrome/i.test(o.join(' ')) && !/not/i.test(o.join(' '))],
  ['count how many vowels are in the word programming', has('3')],
  ['print the first 10 fibonacci numbers', has('0', '1', '2', '3', '5', '8', '13', '21', '34')],
  ['sum all numbers from 1 to 100', has('5050')],
  ['make a record for a person named Ana who is 30 and print her name and age', has('ana', '30')],
  ['FizzBuzz up to 15', has('fizz', 'buzz', 'fizzbuzz')],
];

let pass = 0, fail = 0;
for (const [src, ok] of cases) {
  const r = await executeAsync(src, { agent: { brain: 'online' } });
  const good = r.success && ok(r.output);
  if (good) { pass++; console.log('  ok  ', src); }
  else { fail++; console.log('  FAIL', src, '\n       ', JSON.stringify(r.output).slice(0, 300), r.error ?? ''); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
