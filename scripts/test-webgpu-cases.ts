import { execute } from '../src/lang/index';

type Case = [string, string, (out: string[]) => boolean];
const has = (...parts: string[]) => (o: string[]) => parts.every((p) => o.join('\n').toLowerCase().includes(p.toLowerCase()));

const testCases: Case[] = [
  [
    'Circle area',
    `set r to 2\nset pi to 3.141592653589793\nsay pi * r * r`,
    (o) => /12\.56/.test(o.join(' '))
  ],
  [
    'Shopping list',
    `set items to ["milk", "eggs", "bread"]\nfor each item in sort(items)\n  say item\nend`,
    (o) => /bread[\s\S]*eggs[\s\S]*milk/i.test(o.join('\n'))
  ],
  [
    'Even numbers 1 to 10',
    `for each i in sequence(1, 11)\n  if i % 2 == 0\n    say i\n  end\nend`,
    has('2', '4', '6', '8', '10')
  ],
  [
    'Celsius to Fahrenheit',
    `set c to 100\nsay c * 9 / 5 + 32`,
    has('212')
  ],
  [
    'Max number',
    `set numbers to [4, 17, 9, 12]\nsay max(numbers)`,
    has('17')
  ],
  [
    'Double function on 21',
    `to double with n\n  return n * 2\nend\nsay double(21)`,
    has('42')
  ],
  [
    'Palindrome check',
    `set word to "racecar"\nif word is weave(reverse(chars(word)), "")\n  say "racecar is a palindrome"\nelse\n  say "not a palindrome"\nend`,
    (o) => /yes|true|yep|palindrome/i.test(o.join(' ')) && !/not/i.test(o.join(' '))
  ],
  [
    'Vowel count in programming',
    `set word to "programming"\nset vowels to ["a", "e", "i", "o", "u"]\nset total to 0\nfor each ch in chars(lower(word))\n  if contains(vowels, ch)\n    set total to total + 1\n  end\nend\nsay total`,
    has('3')
  ],
  [
    'Fibonacci 10',
    `set a to 0\nset b to 1\nsay a\nsay b\nfor each i in sequence(2, 10)\n  set c to a + b\nsay c\n  set a to b\n  set b to c\nend`,
    has('0', '1', '2', '3', '5', '8', '13', '21', '34')
  ],
  [
    'Sum 1 to 100',
    `set total to 0\nfor each i in sequence(1, 101)\n  set total to total + i\nend\nsay total`,
    has('5050')
  ],
  [
    'Record for Ana',
    `set person to {name: "Ana", age: 30}\nsay person.name\nsay person.age`,
    has('ana', '30')
  ],
  [
    'FizzBuzz to 15',
    `for each i in sequence(1, 16)\n  if i % 15 == 0\n    say "FizzBuzz"\n  else if i % 3 == 0\n    say "Fizz"\n  else if i % 5 == 0\n    say "Buzz"\n  else\n    say i\n  end\nend`,
    has('fizz', 'buzz', 'fizzbuzz')
  ],
];

let pass = 0, fail = 0;
for (const [name, code, validator] of testCases) {
  const res = execute(code);
  const ok = res.success && validator(res.output);
  if (ok) {
    pass++;
    console.log('  ok  ', name);
  } else {
    fail++;
    console.log('  FAIL', name, res.error, res.output);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
