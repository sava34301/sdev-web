/** Plain-words calculations through the agent. Run: bun scripts/test-math.ts */
import { execute } from '@/lang';
const cases: [string, string][] = [
  ['calculate 23-21','2'],['calculate 23 - 21','2'],['23-21','2'],['compute 10 / 2','5'],
  ['what is 5 times 3','15'],['what is 2 plus 2?','4'],["what's 9 minus 4",'5'],['whats twenty three minus two','21'],
  ['how much is 3 x 4','12'],['add 2 and 3','5'],['add 1, 2 and 3','6'],['multiply 4 by 6','24'],
  ['subtract 3 from 10','7'],['divide 10 by 4','2.5'],['10 divided by 2','5'],['6 multiplied by 7','42'],
  ['square root of 16','4'],['5 squared','25'],['2 cubed','8'],['2 to the power of 10','1024'],['2^8','256'],
  ['15% of 80','12'],['average of 4, 8 and 9','7'],['the sum of 1, 2 and 3','6'],['product of 2, 3 and 4','24'],
  ['difference between 10 and 4','6'],['17 mod 5','2'],['please calculate (2+3)*4','20'],['calculate 12 over 4','3'],
  ['maximum of 3, 9 and 2','9'],['show 7 * 8','56'],['calculate ten plus five','15'],
  ['set x to 5\ncalculate x times 2','10'],
  ['score is 0\nadd 1 to score\nsay score','1'],
  ['set a to 2\nsay a','2'],
];
let pass = 0, fail = 0;
for (const [src, want] of cases) {
  const r = execute(src);
  const got = r.output.join('|');
  if (got === want && r.success) { pass++; console.log('  ok  ', JSON.stringify(src)); }
  else { fail++; console.log('  FAIL', JSON.stringify(src), 'got', JSON.stringify(got), r.error ?? ''); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
