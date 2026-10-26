import { senseFile, isSdevWord } from '../src/lang/agent/sense';
for (const s of ['show 7 * 8', 'set i to 0\nrepeat 2 times\n  say "hi"\nend\nsay "done"']) console.log(JSON.stringify(senseFile(s)), isSdevWord('show'), isSdevWord('repeat'));
