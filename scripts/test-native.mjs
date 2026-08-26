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
  // Milestone 6f: function values, closures, kinds, errors, break/continue.
  { name: 'ref-call',    src: `to twice with n\n  return n * 2\nend\nset f to ref twice\nsay call f(21)`, out: '42\n' },
  { name: 'ref-str',     src: `to hi with n\n  return "hi " + str(n)\nend\nset f to ref hi\nsay call f(3)`, out: 'hi 3\n' },
  { name: 'lambda',      src: `set add to make with a b\n  return a + b\nend\nsay call add(2, 3)`, out: '5\n' },
  { name: 'closure',     src: `set n to 10\nset addn to make with x capture n\n  return x + n\nend\nsay call addn(5)`, out: '15\n' },
  { name: 'closure-two', src: `set p to 2\nset q to 3\nset f to make with x capture p q\n  return x * p + q\nend\nsay call f(4)`, out: '11\n' },
  { name: 'kind-basic',  src: `kind Counter\n  to bump with self\n    set self.n to self.n + 1\n    return self.n\n  end\nend\nset c to new Counter\nset c.n to 0\nsay c.bump()\nsay c.bump()`, out: '1\n2\n' },
  { name: 'kind-str',    src: `kind Greeter\n  to greet with self\n    return "hello " + self.who\n  end\nend\nset g to new Greeter\nset g.who to "ada"\nsay g.greet()`, out: 'hello ada\n' },
  { name: 'kind-args',   src: `kind Adder\n  to plus with self a b\n    return a + b\n  end\nend\nset a to new Adder\nsay a.plus(2, 5)`, out: '7\n' },
  { name: 'inherit',     src: `kind Animal\n  to speak with self\n    return "..."\n  end\n  to tag with self\n    return "animal"\n  end\nend\nkind Dog extends Animal\n  to speak with self\n    return "woof"\n  end\nend\nset d to new Dog\nsay d.speak()\nsay d.tag()`, out: 'woof\nanimal\n' },
  { name: 'super',       src: `kind A\n  to name with self\n    return "A"\n  end\nend\nkind B extends A\n  to name with self\n    return "B<" + super.name() + ">"\n  end\nend\nset b to new B\nsay b.name()`, out: 'B<A>\n' },
  { name: 'attempt',     src: `attempt\n  throw "boom"\n  say "unreachable"\nrescue err\n  say "caught " + err\nend\nsay "after"`, out: 'caught boom\nafter\n' },
  { name: 'attempt-ok',  src: `attempt\n  say "body"\nrescue err\n  say "no"\nend\nsay "done"`, out: 'body\ndone\n' },
  { name: 'throw-fn',    src: `to boom with n\n  throw "bad " + str(n)\nend\nattempt\n  say boom(7)\nrescue e\n  say e\nend`, out: 'bad 7\n' },
  { name: 'break',       src: `set i to 0\nwhile i < 10\n  if i is 3\n    break\n  end\n  say i\n  set i to i + 1\nend`, out: '0\n1\n2\n' },
  { name: 'continue',    src: `for each x in [1, 2, 3, 4]\n  if x is 2\n    continue\n  end\n  say x\nend`, out: '1\n3\n4\n' },


  // Milestone 6g: host file I/O and modules on the native track.
  { name: 'file-io',      src: `say write_file("t.txt", "hello")\nsay read_file("t.txt")\nsay length(read_file("t.txt"))`, out: '1\nhello\n5\n' },
  { name: 'file-missing', src: `say length(read_file("nope.txt"))\nsay file_exists("nope.txt")`, out: '0\n0\n' },
  { name: 'file-exists',  src: `set ok to write_file("a.txt", "x")\nsay file_exists("a.txt")`, out: '1\n' },
  { name: 'file-roundtrip', src: `set body to "line1\\nline2"\nsay write_file("b.txt", body)\nfor each l in split(read_file("b.txt"), "\\n")\n  say l\nend`, out: '1\nline1\nline2\n' },
  { name: 'stdin-input',  src: `set name to input()\nsay "hi " + name`, stdin: 'ada\n', out: 'hi ada\n' },
  // Milestone 6h: process / OS layer on the native track.
  { name: 'args',        src: `set a to args()\nsay length(a)\nfor each x in a\n  say x\nend`, argv: ['one', 'two'], out: '2\none\ntwo\n' },
  { name: 'env-var',     src: `say env("SDEV_TEST_VAR")\nsay length(env("SDEV_NOPE_VAR"))`, env: { SDEV_TEST_VAR: 'hello' }, out: 'hello\n0\n' },
  { name: 'exit-code',   src: `say "bye"\nexit(3)\nsay "never"`, status: 3, out: 'bye\n' },
  { name: 'now-ms',      src: `set t to now_ms()\nif t > 1000000000000\n  say "ok"\nend`, out: 'ok\n' },
  { name: 'sleep-ms',    src: `set a to now_ms()\nsleep_ms(30)\nif now_ms() - a >= 25\n  say "slept"\nend`, out: 'slept\n' },
  { name: 'append-file', src: `say write_file("c.txt", "a")\nsay append_file("c.txt", "b")\nsay read_file("c.txt")`, out: '1\n1\nab\n' },
  { name: 'say-err',     src: `say_err("warn")\nsay "out"`, out: 'out\n', stderr: 'warn\n' },
  { name: 'use-module',   src: `use "m.sdev"\nsay double(21)`, mods: { 'm.sdev': 'to double with n\n  return n * 2\nend\n' }, out: '42\n' },
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
      const asm = generateAsm(c.src, c.mods
        ? { readModule: (path) => { if (!(path in c.mods)) throw new Error(`no module ${path}`); return c.mods[path]; } }
        : {});
      link(asm, bin, { as: bins.as, ld: bins.ld, tmpDir: dir });
      chmodSync(bin, 0o755);
      const r = spawnSync(bin, c.argv ?? [], {
        encoding: 'utf8', cwd: dir, input: c.stdin ?? '',
        env: { ...process.env, ...(c.env ?? {}) },
      });
      const wantStatus = c.status ?? 0;
      if (r.status !== wantStatus) throw new Error(`${c.name} exit ${r.status} (want ${wantStatus}): ${r.stderr}`);
      if (c.stderr !== undefined && r.stderr !== c.stderr) {
        throw new Error(`${c.name} stderr mismatch\n  expected: ${JSON.stringify(c.stderr)}\n  got:      ${JSON.stringify(r.stderr)}`);
      }
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
