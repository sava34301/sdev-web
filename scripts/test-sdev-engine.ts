/**
 * The self-hosted understander (lang/agent/understander.sdev).
 * Run with: bun scripts/test-sdev-engine.ts
 */
import { sdevUnderstand, engineError } from '../src/lang/agent/sdev-engine';
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
  ['mixed canonical', 'forge a be 2\nprint a + 3', '5'],
];
for (const [name, src, want] of cases) {
  const s = sdevUnderstand(src, []);
  const r = execute(src);
  ok(name, !!s?.sure && lastEngine === 'sdev' && r.success && r.output.join('|') === want, JSON.stringify({ s, r, engineError }));
}
// unsure lines fall back to the TypeScript engine
const fb = sdevUnderstand('ask "name" as n', []);
ok('unsure → fallback', fb !== null && !fb.sure);
understand('ask "What is your name?" as name\nsay "Hello, " name');
ok('fallback engine used', lastEngine === 'ts');
// cross-file names: a name from another file is known
const xf = sdevUnderstand('add 1 to total', ['total']);
ok('project names resolve', !!xf?.sure && xf.source === 'total be total + 1', JSON.stringify(xf));
const unk = sdevUnderstand('add 1 to total', []);
ok('unknown name is unsure', !!unk && !unk.sure);
// working programs untouched
const keep = 'forge a be 1\nspeak(a)';
ok('canonical left alone', understand(keep).source === keep);
// speed on a large project-sized file
const big = Array.from({ length: 2000 }, (_, i) => `set v${i} to ${i}\nadd 1 to v${i}`).join('\n');
const t0 = performance.now(); const b = sdevUnderstand(big, []); const ms = performance.now() - t0;
ok(`4000 lines in ${ms.toFixed(0)}ms`, !!b?.sure && ms < 5000);
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
