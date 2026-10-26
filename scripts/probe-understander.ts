import { readFileSync } from 'node:fs';
import { understand, setMemoryStore, emptyMemory, type AgentMemory } from '../src/lang/agent';
import { execute } from '../src/lang';
let memory: AgentMemory = emptyMemory();
setMemoryStore({ load: () => memory, save: (m) => { memory = m; } });
const docs = process.argv.slice(2);
let total = 0, okRun = 0, changed = 0, broke = 0, diff = 0;
for (const d of docs) {
  const text = readFileSync(d, 'utf8');
  const blocks = [...text.matchAll(/```sdev[^\n]*\n([\s\S]*?)```/g)].map(m => m[1]);
  for (const src of blocks) {
    total++;
    if (/\b(ask|input|listen|fetch|http|sleep|wait|summon|link|use )\b/.test(src)) continue;
    let a; try { a = execute(src); } catch { continue; }
    if (!a.success) continue;
    okRun++;
    memory = emptyMemory();
    let u; try { u = understand(src); } catch (e) { broke++; console.log('UNDERSTAND THREW', d, String(e).slice(0,200), '\n', src.slice(0,300)); continue; }
    if (u.source.trim() === src.trim()) continue;
    changed++;
    let b; try { b = execute(u.source); } catch (e) { b = { success: false, error: String(e), output: [] }; }
    const same = b.success && JSON.stringify(b.output) === JSON.stringify(a.output);
    if (!same) {
      diff++;
      console.log(`\n=== ${d} BROKEN by understander (${b.success ? 'output differs' : 'error: ' + b.error})`);
      const A = src.split('\n'), B = u.source.split('\n');
      for (let i = 0; i < Math.max(A.length, B.length); i++) if ((A[i]??'').trim() !== (B[i]??'').trim()) console.log(`  L${i+1}: ${JSON.stringify(A[i])}  ->  ${JSON.stringify(B[i])}`);
      if (b.success) console.log('  before:', JSON.stringify(a.output).slice(0,200), '\n  after: ', JSON.stringify(b.output).slice(0,200));
    }
  }
}
console.log(`\nblocks=${total} runnable=${okRun} rewritten=${changed} broken=${diff} threw=${broke}`);
