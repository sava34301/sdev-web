import { execute } from '@/lang/index';
import { repair } from '@/lang/agent/index';
import { closeBlocks } from '@/lang/agent/repair';
const answers = ['Sam','yes','3','4','4','Paris','no'];
(globalThis as any).prompt = () => answers.shift() ?? '';
const progs = {
hello: `print hello world`,
greet: `ask the user for their name\nsay hello name`,
decide: `ask do you like pizza? and save it as answer\nwhen answer is yes\n  say great, me too\notherwise\n  say more for me then`,
calc: `first number = ask a number\nsecond number = ask another number\nshow first number + second number`,
quiz: `score is 0\nask what is 2 + 2 into a1\nwhen a1 is 4 add 1 to score\nask capital of France into a2\nwhen a2 is Paris add 1 to score\nask is the sky green into a3\nwhen a3 is no add 1 to score\nsay you got score out of 3`,
};
for (const [k, s] of Object.entries(progs)) { const r = repair(s).source; console.log('==',k,'\n'+closeBlocks(r)); console.log(execute(s)); }
