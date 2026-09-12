/**
 * The understanding agent: rules, memory, directives and dialect promotion.
 * Run with: npm run test:agent
 */
import { understand, repair, scanDirectives, promoteToDialect, setMemoryStore, emptyMemory, type AgentMemory } from '../src/lang/agent';
import { execute } from '../src/lang';

let memory: AgentMemory = emptyMemory();
setMemoryStore({ load: () => memory, save: (m) => { memory = m; } });

let passed = 0;
let failed = 0;

function check(name: string, actual: string, expected: string) {
  const a = actual.trim().replace(/[ \t]+/g, ' ');
  const e = expected.trim().replace(/[ \t]+/g, ' ');
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       got:      ${a.replace(/\n/g, ' | ')}\n       expected: ${e.replace(/\n/g, ' | ')}`); }
}

function canon(src: string): string {
  return repair(src).source;
}

console.log('understanding agent');

// ---- the user's own example -----------------------------------------
check(
  'output / out / will be / terminal',
  canon('output Hello\nout Nothing\nname1 will be Twenty\nterminal name1'),
  'say "Hello"\nsay nothing\nset name1 to 20\nsay name1',
);

check('print with quotes', canon('print "hi there"'), 'say "hi there"');
check('echo a variable', canon('set x to 3\necho x'), 'set x to 3\nsay x');
check('equals assignment', canon('total = 4 + 5'), 'set total to 4 + 5');
check('becomes assignment', canon('age becomes 21'), 'set age to 21');
check('several statements on a line', canon('output A; output B'), 'say "A"\nsay "B"');
check('loose condition', canon('if age is greater than 18'), 'if age > 18');
check('at least', canon('if age at least 18'), 'if age is or more 18');
check('function declaration', canon('def greet(name):'), 'to greet with name');
check('foreach loop', canon('for each item in list:'), 'for each item in list');
check('braces close', canon('}'), 'end');
check('give back', canon('give back 7'), 'return 7');

// ---- directives -------------------------------------------------------
const off = scanDirectives('!#agent:off\nsay "x"');
check('directive off', String(off.mode), 'off');
check('directive stripped', off.source.trim(), 'say "x"');
check('directive local', String(scanDirectives('!#agent:local').brain), 'local');
check('directive online', String(scanDirectives('!#agent: online').brain), 'online');

const disabled = understand('!#agent:off\nterminal hi');
check('off leaves the file alone', disabled.source.trim(), 'terminal hi');

// ---- canonical files are untouched -----------------------------------
const clean = 'set x to 2\nsay x\n';
check('canonical stays byte-identical', understand(clean).source, clean);

// ---- memory ------------------------------------------------------------
memory = emptyMemory();
understand('shout "hi"');
check('remembers the user word', memory.words['shout']?.intent ?? 'none', 'say');
check('counts programs', String(memory.programs), '1');

// ---- promotion to a dialect -------------------------------------------
const spec = promoteToDialect({ name: 'My words', memory });
check('promoted dialect slug', spec.meta.slug, 'my-words');
check('promoted synonym', (spec.synonyms['say'] ?? []).join(','), 'shout');

// ---- end to end through the interpreter -------------------------------
const run = execute('output Hello\nname1 will be Twenty\nterminal name1');
check('runs end to end', run.output.join('|'), 'Hello|20');

// ---- sentence-style program from a real user session -------------------
const sentences = understand([
  'I want function called 11 with variable named tuesday',
  'i need wednesday to be tuesday + 1',
  'say to terminal wednesday',
  '',
  'call 11 with 2',
].join('\n')).source;
check('sentence function', sentences.split('\n')[0], 'to n11 with tuesday');
check('sentence assignment', sentences.split('\n')[1].trim(), 'set wednesday to tuesday + 1');
check('sentence say', sentences.split('\n')[2].trim(), 'say wednesday');
check('sentence closes block', String(sentences.includes('end')), 'true');
check('sentence call', String(sentences.includes('n11(2)')), 'true');
check('sentence runs', execute(sentences).output.join('|'), '3');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
