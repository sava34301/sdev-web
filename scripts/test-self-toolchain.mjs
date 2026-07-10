// Milestone 5m gate — self-hosted toolchain round-trip.
//
// Compiles each real toolchain source file (lexer.sdev, parser.sdev,
// codegen.sdev) through the self-hosted shim (`compile-self.mjs`) and
// diffs against the JS bootstrap. Byte-identity means codegen.sdev is
// large enough to be a certified drop-in for the JS oracle on that
// source — a prerequisite for retiring the bootstrap entirely.
//
// codegen.sdev itself is currently gated behind Milestone 5n (widen the
// seed VM memory layout so the JS bootstrap can compile the shim
// driver + escaped user source without overflowing the 8 KiB pool).
// This script keeps it as a warn-only line until that lands.

import { readFileSync } from 'node:fs';
import { compile as refCompile } from '../lang/bootstrap/compile.mjs';
import { compile as selfCompile } from '../lang/compiler/compile-self.mjs';

const TARGETS = [
  { path: 'lang/compiler/lexer.sdev',   required: true  },
  { path: 'lang/compiler/parser.sdev',  required: true  },
  { path: 'lang/compiler/codegen.sdev', required: false },
];

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

let hardFailed = 0;
for (const { path, required } of TARGETS) {
  const src = readFileSync(path, 'utf8');
  const ref = refCompile(src);
  let got;
  try {
    got = await selfCompile(src);
  } catch (e) {
    const tag = required ? '✗' : '⚠';
    console.log(`${tag} ${path}: self-hosted compile threw (${e?.message ?? e})`);
    if (required) hardFailed++;
    continue;
  }
  const ok = bytesEqual(ref.bytecode, got.bytecode) && bytesEqual(ref.stringPool, got.stringPool);
  if (ok) {
    console.log(`✓ ${path}: byte-identical  (bc=${ref.bytecode.length}, pool=${ref.stringPool.length})`);
  } else {
    const tag = required ? '✗' : '⚠';
    console.log(`${tag} ${path}: divergence  ref bc=${ref.bytecode.length}/pool=${ref.stringPool.length}  self bc=${got.bytecode.length}/pool=${got.stringPool.length}`);
    if (required) hardFailed++;
  }
}

if (hardFailed === 0) {
  console.log('✓ toolchain round-trip: lexer + parser byte-identical through the shim');
  process.exit(0);
} else {
  console.log(`✗ toolchain round-trip: ${hardFailed} required target(s) diverged`);
  process.exit(1);
}
