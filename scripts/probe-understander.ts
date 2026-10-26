import { readFileSync } from 'node:fs';
import { understand, setMemoryStore, emptyMemory, type AgentMemory } from '../src/lang/agent';
import { execute } from '../src/lang';
let memory: AgentMemory = emptyMemory();
setMemoryStore({ load: () => memory, save: (m) => { memory = m; } });
const verbose = process.env.V === '1';
let total = 0, okRun = 0, changed = 0, broke = 0, diff = 0, v2changed = 0, v2total = 0;
for (const d of process.argv.slice(2)) {
  const text = readFileSync(d, 'utf8');
  const blocks = d.endsWith('.sdev') ? [text] : [...text.matchAll(/```sdev[^\n]*\n([\s\S]*?)```/g)].map(m => m[1]);
  for (const src of blocks) {
    total++;
    memory = emptyMemory();
    const isV2 = /^#!sdev v2/m.test(src) || d.includes('V2');
    let u; try { u = understand(src); } catch (e) { broke++; console.log('THREW', d, String(e).slice(0, 200)); continue; }
    const rewritten = u.source.trim() !== src.trim();
    if (isV2) { v2total++; if (rewritten) { v2changed++; if (verbose) { console.log(`\n=== V2 REWRITE ${d}`); const A = src.split('\n'), B = u.source.split('\n'); for (let i = 0; i < Math.max(A.length, B.length); i++) if ((A[i] ?? '').trim() !== (B[i] ?? '').trim()) console.log(`  L${i + 1}: ${JSON.stringify(A[i])} -> ${JSON.stringify(B[i])}`); } } continue; }
    if (/\b(ask|input|listen|fetch|http|sleep|wait|summon|link|use )\b/.test(src)) continue;
    let a; try { a = execute(src, { agent: false }); } catch { continue; }
    if (!a.success) continue;
    okRun++;
    if (!rewritten) continue;
    changed++;
    let b; try { b = execute(u.source, { agent: false }); } catch (e) { b = { success: false, error: String(e), output: [] }; }
    const same = b.success && JSON.stringify(b.output) === JSON.stringify(a.output);
    if (!same || verbose) {
      if (!same) diff++;
      console.log(`\n=== ${d} ${same ? 'rewritten (same output)' : 'BROKEN (' + (b.success ? 'output differs' : 'error: ' + b.error) + ')'}`);
      const A = src.split('\n'), B = u.source.split('\n');
      for (let i = 0; i < Math.max(A.length, B.length); i++) if ((A[i] ?? '').trim() !== (B[i] ?? '').trim()) console.log(`  L${i + 1}: ${JSON.stringify(A[i])}  ->  ${JSON.stringify(B[i])}`);
    }
  }
}
console.log(`\nblocks=${total} runnable(v1)=${okRun} rewritten=${changed} broken=${diff} threw=${broke} | v2 blocks=${v2total} v2 rewritten=${v2changed}`);
