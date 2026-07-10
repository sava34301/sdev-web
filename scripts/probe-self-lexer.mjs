// Milestone 5m probe — compile lexer.sdev through the self-hosted shim
// and diff against the JS bootstrap. Prints byte counts, first
// divergence offset, and a short hex window around it.

import { readFileSync } from 'node:fs';
import { compile as refCompile } from '../lang/bootstrap/compile.mjs';
import { compile as selfCompile } from '../lang/compiler/compile-self.mjs';

const target = process.argv[2] ?? 'lang/compiler/lexer.sdev';
const src = readFileSync(target, 'utf8');

const ref = refCompile(src);
let got;
try {
  got = await selfCompile(src);
} catch (e) {
  console.error(`self-hosted compile threw: ${e?.message ?? e}`);
  process.exit(1);
}

console.log(`target       : ${target}`);
console.log(`source bytes : ${src.length}`);
console.log(`JS bootstrap : bc=${ref.bytecode.length}  pool=${ref.stringPool.length}`);
console.log(`Self-hosted  : bc=${got.bytecode.length}  pool=${got.stringPool.length}`);

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

function hexWin(buf, at, r = 8) {
  const s = Math.max(0, at - r);
  const e = Math.min(buf.length, at + r + 1);
  return [...buf.slice(s, e)].map((b, k) => {
    const off = s + k;
    const mark = off === at ? '*' : ' ';
    return `${mark}${b.toString(16).padStart(2, '0')}`;
  }).join(' ');
}

const bcDiff = firstDiff(ref.bytecode, got.bytecode);
const poolDiff = firstDiff(ref.stringPool, got.stringPool);
console.log(`bc first diff   : ${bcDiff}`);
if (bcDiff >= 0) {
  console.log(`  ref: ${hexWin(ref.bytecode, bcDiff)}`);
  console.log(`  got: ${hexWin(got.bytecode, bcDiff)}`);
}
console.log(`pool first diff : ${poolDiff}`);
if (poolDiff >= 0) {
  console.log(`  ref: ${hexWin(ref.stringPool, poolDiff)}`);
  console.log(`  got: ${hexWin(got.stringPool, poolDiff)}`);
}
