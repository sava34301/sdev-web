import { wordsNeedReading, senseFile, understand } from '../src/lang/agent';
const s = '#!sdev v2\nset x to 4\nterminal x * 2';
console.log(wordsNeedReading(s), JSON.stringify(senseFile(s)), JSON.stringify(understand(s).source));
