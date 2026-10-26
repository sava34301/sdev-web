import { readFileSync } from 'node:fs';
import { senseFile } from '../src/lang/agent/sense';
const t = readFileSync('public/SDEV_V2_DOCUMENTATION.md', 'utf8') + '\n```sdev\n' + readFileSync('public/samples/welcome.v2.sdev', 'utf8') + '```';
const MEANING = /is not canonical sdev|asks for input in words|calculation asked for in words|names the output destination|a call written in words/;
const c: Record<string, number> = {};
for (const m of t.matchAll(/```sdev[^\n]*\n([\s\S]*?)```/g)) {
  const s = senseFile(m[1]);
  for (const r of s.reasons) if (MEANING.test(r)) { const line = m[1].split('\n')[Number(r.match(/line (\d+)/)?.[1] ?? 1) - 1]; console.log(r, ' | ', JSON.stringify(line)); }
}
