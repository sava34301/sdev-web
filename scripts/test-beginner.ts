/**
 * The beginner path: five first programs, written the way someone who has
 * never seen sdev would write them. The agent must make every one run.
 * Run with: bun scripts/test-beginner.ts
 */
import { setMemoryStore, emptyMemory, type AgentMemory, understand } from '../src/lang/agent';
import { execute } from '../src/lang';

let memory: AgentMemory = emptyMemory();
setMemoryStore({ load: () => memory, save: (m) => { memory = m; } });

let passed = 0;
let failed = 0;

/** Feed typed answers to the program, one per `ask`. */
function run(src: string, answers: string[] = []): string {
  const queue = [...answers];
  (globalThis as { prompt?: (t: string) => string }).prompt = () => queue.shift() ?? '';
  const r = execute(src);
  return r.success ? r.output.join('|') : `ERROR: ${r.error}`;
}

function check(name: string, src: string, answers: string[], expected: string) {
  const got = run(src, answers);
  if (got === expected) { passed++; console.log(`  ok   ${name}`); }
  else {
    failed++;
    console.log(`  FAIL ${name}\n       got:      ${got}\n       expected: ${expected}`);
    console.log('       canonical:\n' + understand(src).source.split('\n').map((l) => '         ' + l).join('\n'));
  }
}

console.log('1. hello world');
check('print bare words', 'print hello world', [], 'hello world');
check('say with quotes', 'say "Hello, World!"', [], 'Hello, World!');
check('output Hello World', 'output Hello World', [], 'Hello World');
check('show on screen', 'show on the screen Hello World', [], 'Hello World');

console.log('2. personal greeting');
check('ask … as name', 'ask "What is your name?" as name\nsay "Hello, " name', ['Sam'], 'Hello, Sam');
check('ask … into name', 'ask "What is your name?" into name\nprint Hello name', ['Sam'], 'Hello Sam');
check('name = ask', 'name = ask "What is your name?"\nsay "Hello, " + name', ['Sam'], 'Hello, Sam');
check('ask name bare', 'ask name\nsay Hello, name', ['Sam'], 'Hello, Sam');
check('bracket placeholder', 'ask "What is your name?" as name\nsay "Hello, [name]"', ['Sam'], 'Hello, Sam');
check('brace placeholder', 'ask for name\nsay "Hello, {name}!"', ['Sam'], 'Hello, Sam!');

console.log('3. make a decision');
const decision = [
  'ask "Do you like pizza?" as answer',
  'when answer is yes',
  '  say "Me too!"',
  'otherwise',
  '  say "More for me then."',
].join('\n');
check('yes branch', decision, ['yes'], 'Me too!');
check('no branch', decision, ['no'], 'More for me then.');
check('Yes with capitals', decision, ['Yes'], 'Me too!');
const decision2 = [
  'ask "Are you hungry? (yes/no)" as hungry',
  'hungry is yes:',
  '  print "Grab a snack"',
  'else:',
  '  print "Ok, later"',
].join('\n');
check('bare condition line', decision2, ['yes'], 'Grab a snack');

console.log('4. simple calculator');
check('add two numbers', 'ask "First number?" as a\nask "Second number?" as b\nshow a + b', ['2', '3'], '5');
check('multiply', 'a = ask "number one"\nb = ask "number two"\nsay a * b', ['4', '5'], '20');
check('result sentence',
  'ask "First number?" as x\nask "Second number?" as y\nresult is x + y\nsay "The answer is " result',
  ['10', '32'], 'The answer is 42');

console.log('5. mini quiz');
const quiz = [
  'score is 0',
  '',
  'ask "What is 2 + 2?" as one',
  'if one is 4',
  '  say "Correct!"',
  '  add 1 to score',
  'otherwise',
  '  say "Nope, it is 4"',
  'ask "What colour is the sky?" as two',
  'if two is blue',
  '  say "Correct!"',
  '  score becomes score + 1',
  'ask "How many legs does a spider have?" as three',
  'if three is 8',
  '  say "Correct!"',
  '  increase score by 1',
  '',
  'say "You got [score] out of 3"',
].join('\n');
check('all right', quiz, ['4', 'blue', '8'], 'Correct!|Correct!|Correct!|You got 3 out of 3');
check('one wrong', quiz, ['5', 'Blue', '8'], 'Nope, it is 4|Correct!|Correct!|You got 2 out of 3');
check('all wrong', quiz, ['1', 'red', '6'], 'Nope, it is 4|You got 0 out of 3');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
