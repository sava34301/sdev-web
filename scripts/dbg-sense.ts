import { senseFile, unknownNames } from '../src/lang/agent/sense';
for (const s of ['show 7 * 8', 'repeat 2 times\n  say "hi"\nsay "done"', 'shout "hi"']) console.log(JSON.stringify(senseFile(s)), unknownNames(s));
