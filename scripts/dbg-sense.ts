import { repair } from '../src/lang/agent/repair';
for (const s of ['to greet with a name\n  say name\nend', 'def greet(name):', 'function add(a, b) {', 'make a function called greet that takes name', 'give back the total', 'return a + b', 'print("hi")', 'say(x + 1) * 2']) console.log(JSON.stringify(s), '->', JSON.stringify(repair(s).source));
