import { callMicroBrain } from '../src/lang/agent/micro-brain';
import { execute } from '../src/lang/index';

type Case = [string, string, (out: string[]) => boolean];
const has = (...parts: string[]) => (o: string[]) => parts.every((p) => o.join('\n').toLowerCase().includes(p.toLowerCase()));

const benchmarks: [string, (o: string[]) => boolean][] = [
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

console.log('=== WebGPU Micro-Brain Natural Language Benchmark Suite ===');
let pass = 0, fail = 0;

for (const [prompt, validator] of benchmarks) {
  const reply = await callMicroBrain({
    source: prompt,
    draft: prompt,
    unresolved: [1],
    vocabulary: {},
  });

  if (!reply || !reply.canonical) {
    fail++;
    console.log('  FAIL (no reply)', prompt);
    continue;
  }

  const res = execute(reply.canonical);
  const ok = res.success && validator(res.output);
  if (ok) {
    pass++;
    console.log('  ok  ', prompt);
  } else {
    fail++;
    console.log('  FAIL', prompt, '\nGenerated code:\n' + reply.canonical, '\nOutput:', res.output, 'Error:', res.error);
  }
}

console.log(`\nResults: ${pass} passed, ${fail} failed out of ${benchmarks.length} benchmarks`);
process.exit(fail ? 1 : 0);
