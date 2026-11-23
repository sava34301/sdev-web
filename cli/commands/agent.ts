import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { understandAsync, promoteToDialect, loadMemory } from '@/lang/agent';
import { die, flag, runOptions, value } from '../args';
import { explainAgent, prepareAsync, readSource } from '../pipeline';
import { saveDialect } from '../store';

export async function cmdAgent(sub: string | undefined, rest: string[]): Promise<void> {
  const memory = loadMemory();
  switch (sub ?? 'status') {
    case 'status': {
      const words = Object.entries(memory.words);
      console.log(`programs learned from : ${memory.programs}`);
      console.log(`words learned         : ${words.length}`);
      console.log(`line rewrites cached  : ${Object.keys(memory.lines).length}`);
      if (words.length) {
        console.log('\nyour words:');
        for (const [word, e] of words.sort((a, b) => b[1].hits - a[1].hits).slice(0, 40)) {
          console.log(`  ${word.padEnd(16)} -> ${e.intent}  (${e.hits})`);
        }
      }
      return;
    }
    case 'explain': {
      const file = rest[0] ?? die('sdev agent explain <file>');
      const opts = runOptions();
      const prepared = await prepareAsync(readSource(file), opts);
      explainAgent(prepared.agent);
      console.log('\n--- canonical sdev ---');
      console.log(prepared.code);
      return;
    }
    case 'understand': {
      const file = rest[0] ?? die('sdev agent understand <file>');
      const result = await understandAsync(readSource(file), { mode: 'on' });
      const out = value('-o', '--out');
      if (out) { writeFileSync(resolve(process.cwd(), out), result.source); console.log('written:', out); }
      else console.log(result.source);
      return;
    }
    case 'promote': {
      const name = rest.join(' ') || 'My way of writing';
      const spec = promoteToDialect({ name, memory, rename: flag('--rename') });
      saveDialect(spec);
      const learned = Object.keys(spec.synonyms).length;
      console.log(`dialect "${spec.meta.name}" (${spec.meta.slug}) created from ${learned} learned word groups.`);
      console.log(`activate it with: sdev dialect use ${spec.meta.slug}`);
      return;
    }
    case 'forget': {
      localStorage.removeItem('sdev_agent_memory');
      console.log('the agent forgot everything it learned.');
      return;
    }
    default:
      die('sdev agent <status|explain|understand|promote|forget>');
  }
}
