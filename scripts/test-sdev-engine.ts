/**
 * The self-hosted understander (lang/agent/understander.sdev).
 * Run with: bun scripts/test-sdev-engine.ts
 */
import { sdevUnderstand, engineError, aiToSdev, sdevToAi } from '../src/lang/agent/sdev-engine';
import { setMemoryStore, emptyMemory, type AgentMemory, lastEngine, understand } from '../src/lang/agent';
import { execute } from '../src/lang';

let memory: AgentMemory = emptyMemory();
setMemoryStore({ load: () => memory, save: (m) => { memory = m; } });
let passed = 0, failed = 0;
const ok = (name: string, cond: boolean, info = '') => { cond ? passed++ : failed++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : '  ' + info}`); };

const cases: [string, string, string][] = [
  ['bare print', 'print hello world', 'hello world'],
  ['calculate', 'calculate 23-21', '2'],
  ['what is (words)', 'what is 5 times 3?', '15'],
  ["what's", "what's 10 divided by 4", '2.5'],
  ['power words', 'calculate 2 to the power of 10', '1024'],
  ['set / add / say', 'set x to 5\nadd 2 to x\nsay x', '7'],
  ['= / increase / print', 'score = 0\nincrease score by 3\nprint score', '3'],
  ['decrease', 'set n to 10\ndecrease n by 4\nshow n', '6'],
  ['becomes', 'set t to 1\nt becomes t * 9\nprint t', '9'],
  ['quoted say', 'say "Hi there"', 'Hi there'],
  ['ask … as name', 'ask "Name?" as name\nsay "Hello, " name', 'Hello, Sam'],
  ['ask for', 'ask for name\nsay "Hi " name "!"', 'Hi Sam!'],
  ['= ask', 'name = ask "Who?"\nprint name', 'Sam'],
  ['when / otherwise', 'set a to 2\nwhen a is 2\n  say "two"\notherwise\n  say "no"\nsay "done"', 'two|done'],
  ['if with colon', 'set n to 5\nif n > 3:\n  print n\nsay "end"', '5|end'],
  ['nested blocks', 'set n to 5\nif n > 3\n  if n < 9\n    say "mid"\nsay "x"', 'mid|x'],
  ['yes answer', 'ask "Hungry?" as h\nwhen h is yes\n  say "eat"\notherwise\n  say "no"', 'no'],
  ['typed numbers', 'ask "a" as a\nask "b" as b\nsay a * b', '16'],
  ['placeholder', 'ask "n" as name\nsay "Hello, [name]!"', 'Hello, Sam!'],
  ['say N times', 'say hi 3 times', 'hi|hi|hi'],
  ['repeat block', 'repeat 2 times\n  say "hi"\nsay "done"', 'hi|hi|done'],
  ['count down', 'print numbers from 3 to 1', '3|2|1'],
  ['count by', 'count from 0 to 10 by 5', '0|5|10'],
  ['count to', 'please count to 2', '1|2'],
  ['mixed canonical', 'forge a be 2\nprint a + 3', '5'],
];
for (const [name, src, want] of cases) {
  (globalThis as { prompt?: () => string }).prompt = () => (name === 'typed numbers' ? '4' : name === 'yes answer' ? ' No ' : 'Sam');
  const s = sdevUnderstand(src, []);
  const r = execute(src);
  ok(name, !!s?.sure && lastEngine === 'sdev' && r.success && r.output.join('|') === want, JSON.stringify({ s, r, engineError }));
}
// unsure lines fall back to the TypeScript engine
const fb = sdevUnderstand('hungry is yes:\n  say "eat"', []);
ok('unsure → fallback', fb !== null && !fb.sure);
understand('reverse hello');
ok('fallback engine used', lastEngine === 'ts');
// cross-file names: a name from another file is known
const xf = sdevUnderstand('add 1 to total', ['total']);
ok('project names resolve', !!xf?.sure && xf.source === 'total be total + 1', JSON.stringify(xf));
const unk = sdevUnderstand('add 1 to total', []);
ok('unknown name is unsure', !!unk && !unk.sure);
// working programs untouched
const keep = 'forge a be 1\nspeak(a)';
ok('canonical left alone', execute(keep).output.join() === '1');
// speed on a large project-sized file
const big = Array.from({ length: 2000 }, (_, i) => `set v${i} to ${i}\nadd 1 to v${i}`).join('\n');
const t0 = performance.now(); const b = sdevUnderstand(big, []); const ms = performance.now() - t0;
ok(`4000 lines in ${ms.toFixed(0)}ms`, !!b?.sure && ms < 5000);
// dialect words reach the sdev engine
const dw = sdevUnderstand('печатай "здравей"', [], [['печатай', 'say']]);
ok('dialect words', !!dw?.sure && dw.source === 'speak("здравей")', JSON.stringify(dw));
// sdev:ai — the AI dialect
const ai = '!#ai\nf add(a, b) {\n  r a + b\n}\nv x = add(2, 3)\n? x == 5 && true {\n  p("five == " + "ok")\n} : {\n  p("no")\n}\nv i = 0\nw i < 2 {\n  p(i)\n  i = i + 1\n}\neach n in [7, 8] {\n  ? n != 7 {\n    p(n)\n  }\n}';
const air = execute(ai);
ok('sdev:ai runs', air.success && air.output.join('|') === 'five == ok|0|1|8', JSON.stringify(air));
const canon = aiToSdev(ai);
ok('sdev:ai round trip', aiToSdev(sdevToAi(canon)) === canon);
ok('strings untouched', canon.includes('"five == "'));
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
