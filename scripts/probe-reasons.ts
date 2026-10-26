import { readFileSync } from 'node:fs';
import { senseFile, unknownNames } from '../src/lang/agent';
import { execute } from '../src/lang';
const counts: Record<string, number> = {};
for (const d of process.argv.slice(2)) {
  const text = readFileSync(d, 'utf8');
  for (const m of text.matchAll(/```sdev[^\n]*\n([\s\S]*?)```/g)) {
    const src = m[1];
    if (/\b(ask|input|listen|fetch|http|sleep|wait|summon|link|use )\b/.test(src)) continue;
    let a; try { a = execute(src); } catch { continue; }
    if (!a.success) continue;
    const s = senseFile(src);
    for (const r of s.reasons) { const k = r.replace(/^line \d+: /, '').replace(/"[^"]*"/, (x)=>x); counts[k] = (counts[k]||0)+1; }
  }
}
console.log(Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,40).map(([k,v])=>v+'  '+k).join('\n'));
