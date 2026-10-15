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
{
  const { sdevDefinedNames } = await import('../src/lang/agent/sdev-engine');
  const { definedNames } = await import('../src/lang/agent/sense');
  const src = 'set x to 1\nto add with a b\n  return a + b\nend\nfor each n, m in xs\ny = 2\nfn sq(p, q=1) {}\nv = map(xs, (u, w) => u + w)\ngreet with "world"\nforge имя be 1';
  const a = [...(sdevDefinedNames(src) ?? [])].sort().join(','), b = [...definedNames(src)].sort().join(',');
  ok('project index (sdev) matches TypeScript', a === b, a + ' vs ' + b);
}
understand('hungry is yes:\n  say "eat"');
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
// after a one-line edit only the changed part is read again
{
  const unit = (i: number) => `set n${i} to ${i}\nif n${i} is 5 or more\n  say "big"\nelse\n  say "small"\n`;
  const src = Array.from({ length: 800 }, (_, i) => unit(i)).join('');
  const first = sdevUnderstand(src, []);
  const t = performance.now();
  const again = sdevUnderstand(src.replace('set n400 to 400', 'set n400 to 401'), []);
  const ms = performance.now() - t;
  ok(`one edit in a 4000-line file: ${ms.toFixed(0)}ms`, !!again?.sure && ms < 600 && again.source === first!.source.replace('n400 be 400', 'n400 be 401'), again?.source.slice(0, 80));
}
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

// ---- block-closing rules written in sdev (lang/agent/blocks.sdev) ----
{
  const { sdevCloseBlocks, sdevCloseAiBraces, sdevCheckBlocks } = await import('../src/lang/agent/sdev-engine');
  const { closeBlocks } = await import('../src/lang/agent/repair');
  const samples = [
    'set n to 5\nif n > 3\n  say "big"\nsay "done"',
    'set n to 2\nif n is 2\n  say "two"\nelse\n  say "no"\nsay "x"',
    'to add with a b\n  return a + b\n\nsay add(1, 2)',
    'set i to 0\nwhile i < 3\n  if i is 1\n    say "one"\n  set i to i + 1',
    'if 1 < 2\n  say "a"\nend\nsay "b"',
  ];
  for (const s of samples) ok('sdev block closer matches: ' + s.split('\n')[1], sdevCloseBlocks(s) === closeBlocks(s));
  const ai = '!#ai\nv s = 0\neach n in [1, 2, 3] {\n  s += n\n  ? n == 2 {\n    p("two")\np("total " + str(s))';
  ok('sdev:ai forgotten braces are closed', (sdevCloseAiBraces(ai).match(/}/g) ?? []).length === 2);
  const r = execute(aiToSdev(ai), { agent: false });
  ok('sdev:ai with += and missing braces runs', r.output.join('|') === 'two|total 6', r.output.join('|'));
  ok('block check reports stray and unclosed', sdevCheckBlocks('ponder yep ::\n;;\n;;\nponder yep ::').length === 2);
}
console.log(`\n${passed} passed, ${failed} failed`);
