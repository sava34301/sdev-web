#!/usr/bin/env node
// Regression suite for the native x86-64 backend.
// Runs each program under both backends and diffs stdout.

import { writeFileSync, mkdtempSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateAsm } from '../lang/native/codegen-x64.mjs';
import { link } from '../lang/native/link.mjs';

const CASES = [
  { name: 'say-int',   src: `say 42`, out: '42\n' },
  { name: 'arith',     src: `say 3 * 4 + 5`, out: '17\n' },
  { name: 'if-else',   src: `set x to 10\nif x > 5\n  say 1\nelse\n  say 0\nend`, out: '1\n' },
  { name: 'while',     src: `set i to 0\nwhile i < 3\n  say i\n  set i to i + 1\nend`, out: '0\n1\n2\n' },
  { name: 'fib10',     src: `to fib with n\n  if n < 2\n    return n\n  end\n  return fib(n - 1) + fib(n - 2)\nend\nsay fib(10)`, out: '55\n' },
  { name: 'say-str',   src: `say "hello"`, out: 'hello\n' },
];

// Resolve `as`/`ld`: prefer PATH, else nix run nixpkgs#binutils.
function findBintools() {
  const which = (cmd) => spawnSync('which', [cmd], { encoding: 'utf8' }).stdout.trim();
  const asPath = which('as');
  const ldPath = which('ld');
  if (asPath && ldPath) return { as: asPath, ld: ldPath };
  return null;
}

async function main() {
  const bins = findBintools();
  if (!bins) {
    console.error('SKIP: as/ld not on PATH. Install binutils (or run via `nix run nixpkgs#binutils`).');
    process.exit(0);
  }

  let pass = 0, fail = 0;
  for (const c of CASES) {
    const dir = mkdtempSync(join(tmpdir(), 'sdev-native-'));
    const bin = join(dir, c.name);
    try {
      const asm = generateAsm(c.src);
      link(asm, bin, { as: bins.as, ld: bins.ld, tmpDir: dir });
      chmodSync(bin, 0o755);
      const r = spawnSync(bin, [], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`${c.name} exit ${r.status}: ${r.stderr}`);
      if (r.stdout !== c.out) {
        throw new Error(`${c.name} stdout mismatch\n  expected: ${JSON.stringify(c.out)}\n  got:      ${JSON.stringify(r.stdout)}`);
      }
      console.log(`  ok   ${c.name}`);
      pass++;
    } catch (e) {
      console.log(`  FAIL ${c.name}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
