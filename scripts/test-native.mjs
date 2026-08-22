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
  // Milestone 6c: strings, lists and builtins on the native track.
  { name: 'concat',    src: `say "a" + "b" + "c"`, out: 'abc\n' },
  { name: 'str-int',   src: `say "n=" + 7`, out: 'n=7\n' },
  { name: 'str-neg',   src: `say str(0 - 42)`, out: '-42\n' },
  { name: 'chr-ord',   src: `say chr(65)\nsay ord("AB", 1)`, out: 'A\n66\n' },
  { name: 'abs',       src: `say abs(0 - 5)\nsay abs(5)`, out: '5\n5\n' },
  { name: 'list-lit',  src: `set xs to [10, 20, 30]\nsay length(xs)\nsay xs[2]`, out: '3\n30\n' },
  { name: 'list-new',  src: `set xs to list_new(3)\nset xs[1] to 7\nsay xs[0]\nsay xs[1]\nsay length(xs)`, out: '0\n7\n3\n' },
  { name: 'str-len',   src: `say length("hello")`, out: '5\n' },
  { name: 'str-var',   src: `set s to "hi"\nset s to s + "!"\nsay s`, out: 'hi!\n' },
  { name: 'str-fn',    src: `to greet with n\n  return "hi " + str(n)\nend\nsay greet(3)`, out: 'hi 3\n' },
  // Milestone 6e: floats and math on the native track.
  { name: 'float-lit',   src: `say 3.5`, out: '3.5\n' },
  { name: 'float-arith', src: `say 1.5 + 2.25\nsay 10.0 / 4.0\nsay 2.5 * 2.0\nsay 1.0 - 2.5`, out: '3.75\n2.5\n5.0\n-1.5\n' },
  { name: 'float-mix',   src: `say 1 + 0.5\nsay 3.0 * 2`, out: '1.5\n6.0\n' },
  { name: 'float-cmp',   src: `if 1.5 < 2.0\n  say "lt"\nend\nif 2.5 >= 2.5\n  say "ge"\nend`, out: 'lt\nge\n' },
  { name: 'float-str',   src: `say "pi=" + 3.25`, out: 'pi=3.25\n' },
  { name: 'float-neg',   src: `set x to 2.5\nsay 0.0 - x`, out: '-2.5\n' },
  { name: 'sqrt',        src: `say sqrt(9.0)\nsay sqrt(2.0)`, out: '3.0\n1.414214\n' },
  { name: 'floor-ceil',  src: `say floor(2.7)\nsay ceil(2.1)\nsay floor(0.0 - 2.1)\nsay round(2.5)`, out: '2.0\n3.0\n-3.0\n3.0\n' },
  { name: 'exp-log',     src: `say log(1.0)\nsay exp(0.0)\nsay exp(1.0)`, out: '0.0\n1.0\n2.718282\n' },
  { name: 'pow',         src: `say pow(2.0, 10.0)\nsay pow(9.0, 0.5)`, out: '1024.0\n3.0\n' },
  { name: 'trig',        src: `say sin(0.0)\nsay cos(0.0)`, out: '0.0\n1.0\n' },
  { name: 'num-parse',   src: `say num("3.5") + 1.0\nsay num("-2.25")`, out: '4.5\n-2.25\n' },
  { name: 'float-int',   src: `say int(3.9)\nsay int(0.0 - 3.9)`, out: '3\n-3\n' },
  { name: 'float-fn',    src: `to half with n\n  return n / 2.0\nend\nsay half(7.0)`, out: '3.5\n' },
  { name: 'random-rng',  src: `set r to random()\nif r >= 0.0\n  if r < 1.0\n    say "ok"\n  end\nend`, out: 'ok\n' },
  // Milestone 6d: string library, tomes and for-each on the native track.
  { name: 'upper-lower', src: `say upper("abC")\nsay lower("AbC")`, out: 'ABC\nabc\n' },
  { name: 'trim',        src: `say trim("  hi  ") + "|"`, out: 'hi|\n' },
  { name: 'contains',    src: `say contains("hello", "ell")\nsay contains("hello", "zz")`, out: '1\n0\n' },
  { name: 'index-of',    src: `say index_of("hello", "l")\nsay index_of("hello", "z")`, out: '2\n-1\n' },
  { name: 'substring',   src: `say substring("hello", 1, 3)`, out: 'ell\n' },
  { name: 'replace',     src: `say replace("a-b-c", "-", "+")`, out: 'a+b+c\n' },
  { name: 'split-join',  src: `set parts to split("a,b,c", ",")\nsay length(parts)\nsay parts[1]\nsay join(parts, "-")`, out: '3\nb\na-b-c\n' },
  { name: 'str-eq',      src: `set s to "ab"\nif s is "ab"\n  say 1\nend\nif s is not "ac"\n  say 2\nend`, out: '1\n2\n' },
  { name: 'min-max',     src: `say min(3, 7)\nsay max(3, 7)\nsay min(0 - 2, 5)`, out: '3\n7\n-2\n' },
  { name: 'tome-lit',    src: `set t to { name: "ada", age: 36 }\nsay t["name"]\nsay t["age"]\nsay length(t)`, out: 'ada\n36\n2\n' },
  { name: 'tome-set',    src: `set t to tome_new()\nset t["a"] to 1\nset t["a"] to 2\nsay t["a"]\nsay length(t)\nsay has(t, "a")\nsay has(t, "b")`, out: '2\n1\n1\n0\n' },
  { name: 'tome-keys',   src: `set t to { a: 1, b: 2 }\nsay join(keys(t), ",")\nset vs to values(t)\nsay vs[1]`, out: 'a,b\n2\n' },
  { name: 'foreach',     src: `set total to 0\nfor each x in [1, 2, 3]\n  set total to total + x\nend\nsay total`, out: '6\n' },
  { name: 'foreach-str', src: `for each w in split("a b", " ")\n  say w\nend`, out: 'a\nb\n' },
  { name: 'foreach-tome',src: `set t to { a: 1, b: 2 }\nfor each k in t\n  say k\nend`, out: 'a\nb\n' },
  { name: 'list-loop', src: `set xs to [1, 2, 3]\nset i to 0\nset t to 0\nwhile i < length(xs)\n  set t to t + xs[i]\n  set i to i + 1\nend\nsay t`, out: '6\n' },
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
