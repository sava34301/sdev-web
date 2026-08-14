// Standalone Node harness: compile + run via the seed WASM. No browser.
import { readFile, writeFile, readFile as fsReadFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { compile as selfCompile } from '../lang/compiler/compile-self.mjs';
// The JS bootstrap survives ONLY as a build/test tool: the self-hosted
// codegen does not speak floats or host I/O yet (Milestone 5q). Cases
// tagged `compiler: 'bootstrap'` still exercise those seed VM opcodes.
import { compile as bootstrapCompile } from '../lang/bootstrap/compile.mjs';

const wasmBytes = await readFile('./public/wasm/sdev-seed.wasm');
const module = await WebAssembly.compile(wasmBytes);

const decoder = new TextDecoder();
const encoder = new TextEncoder();

async function runProgram(src, which = 'self') {
  const { bytecode, stringPool } =
    which === 'bootstrap' ? bootstrapCompile(src) : await selfCompile(src);
  const output = [];
  let mem;
  let alloc_str;

  // Host: read a file synchronously and materialise its bytes as a
  // length-prefixed blob inside VM memory.
  const host_read_file = (ptr, len) => {
    try {
      const path = decoder.decode(new Uint8Array(mem.buffer, ptr, len));
      const buf = readFileSync(path);
      const dst = alloc_str(buf.length);
      new Uint8Array(mem.buffer, dst + 4, buf.length).set(buf);
      return dst;
    } catch {
      // Return an empty length-prefixed blob so `length()` reports 0.
      return alloc_str(0);
    }
  };
  const host_write_file = (pPtr, pLen, dPtr, dLen) => {
    try {
      const path = decoder.decode(new Uint8Array(mem.buffer, pPtr, pLen));
      const data = new Uint8Array(mem.buffer, dPtr, dLen).slice();
      writeFileSync(path, data);
      return 0;
    } catch { return -1; }
  };
  const host_http_get = (ptr, len) => {
    try {
      const url = decoder.decode(new Uint8Array(mem.buffer, ptr, len));
      // Use curl as a sync HTTP client; skipped in offline test envs.
      const out = execFileSync('curl', ['-sSL', '--max-time', '10', url], { maxBuffer: 8 * 1024 * 1024 });
      const dst = alloc_str(out.length);
      new Uint8Array(mem.buffer, dst + 4, out.length).set(out);
      return dst;
    } catch { return 0; }
  };

  const inst = await WebAssembly.instantiate(module, {
    env: {
      host_say_i32: (n) => output.push(String(n)),
      host_say_str: (ptr, len) => output.push(decoder.decode(new Uint8Array(mem.buffer, ptr, len))),
      host_say_f64: (x) => output.push(String(x)),
      host_fmath: (op,a,b) => [Math.sin,Math.cos,Math.tan,Math.exp,Math.log,(x,y)=>Math.pow(x,y)][op](a,b),
      host_read_file, host_write_file, host_http_get,
    },
  });
  mem = inst.exports.memory;
  alloc_str = inst.exports.alloc_str;
  const memU8 = new Uint8Array(mem.buffer);
  memU8.set(stringPool, 0);
  const codeBase = inst.exports.code_base();
  memU8.set(bytecode, codeBase);
  inst.exports.set_prog_len(bytecode.length);
  inst.exports.run();
  return output;
}

const cases = [
  {
    name: 'basic + strings',
    src: `say "hello"\nsay 6 * 7`,
    expect: ['hello', '42'],
  },
  {
    name: 'if/else + while',
    src: `set x to 3\nif x is 3\nsay "three"\nelse\nsay "no"\nend\nset i to 0\nwhile i < 3\nsay i\nset i to i + 1\nend`,
    expect: ['three', '0', '1', '2'],
  },
  {
    name: 'function + recursion (fib 10)',
    src: `to fib with n\nif n < 2\nreturn n\nend\nreturn fib(n - 1) + fib(n - 2)\nend\nsay fib(10)`,
    expect: ['55'],
  },
  {
    name: 'mutual recursion (even/odd)',
    src: `to is_even with n\nif n is 0\nreturn 1\nend\nreturn is_odd(n - 1)\nend\nto is_odd with n\nif n is 0\nreturn 0\nend\nreturn is_even(n - 1)\nend\nsay is_even(10)\nsay is_odd(10)`,
    expect: ['1', '0'],
  },
  {
    name: 'locals & params (factorial 6)',
    src: `to fact with n\nif n <= 1\nreturn 1\nend\nreturn n * fact(n - 1)\nend\nsay fact(6)`,
    expect: ['720'],
  },
  // ---- Milestone 4: heap, lists, strings ----
  {
    name: 'list literal + indexing + length',
    src: `set xs to [10, 20, 30]\nsay length(xs)\nsay xs[0]\nsay xs[2]`,
    expect: ['3', '10', '30'],
  },
  {
    name: 'list mutation (set xs[i] to v)',
    src: `set xs to [1, 2, 3]\nset xs[1] to 99\nsay xs[0]\nsay xs[1]\nsay xs[2]`,
    expect: ['1', '99', '3'],
  },
  {
    name: 'list sum loop',
    src: `set xs to [4, 5, 6, 7]\nset i to 0\nset total to 0\nwhile i < length(xs)\nset total to total + xs[i]\nset i to i + 1\nend\nsay total`,
    expect: ['22'],
  },
  {
    name: 'string concat + length',
    src: `set g to concat("hello, ", "world")\nsay g\nsay length(g)`,
    expect: ['hello, world', '12'],
  },
  {
    name: 'string concat via +',
    src: `set n to "sdev"\nsay "hi " + n + "!"`,
    expect: ['hi sdev!'],
  },
  // ---- Milestone 5a: byte-level string primitives ----
  {
    name: 'ord + chr roundtrip',
    src: `set s to "ABC"\nsay ord(s, 0)\nsay ord(s, 2)\nsay chr(65) + chr(66) + chr(67)`,
    expect: ['65', '67', 'ABC'],
  },
  {
    name: 'int to string (positive, zero, negative)',
    src: `say str(0)\nsay str(1234)\nsay str(0 - 42)\nsay "n=" + str(7)`,
    expect: ['0', '1234', '-42', 'n=7'],
  },
  {
    name: 'byte-level string build (uppercase via chr/ord)',
    src: `set s to "abc"\nset i to 0\nset out to ""\nwhile i < length(s)\nset out to out + chr(ord(s, i) - 32)\nset i to i + 1\nend\nsay out`,
    expect: ['ABC'],
  },
  // ---- Milestone 6: floats ----
  {
    name: 'float literal + arithmetic',
    // Milestone 5q: floats + host I/O now compile through the self-hosted path.
    src: `say 0.5 + 0.25\nsay 3.0 * 2.5\nsay 10.0 / 4.0\nsay 1.0 - 0.5`,
    expect: ['0.75', '7.5', '2.5', '0.5'],
  },
  {
    name: 'float builtins: fsqrt, fabs, fneg',
    src: `say fsqrt(16.0)\nsay fabs(0.0 - 3.5)\nsay fneg(2.5)`,
    expect: ['4', '3.5', '-2.5'],
  },
  {
    name: 'i2f / f2i round-trip',
    src: `set x to i2f(7)\nsay x + 0.5\nsay f2i(x + 0.9)`,
    expect: ['7.5', '7'],
  },
  {
    name: 'float comparisons',
    src: `if 0.5 < 1.0\nsay "lt"\nend\nif 2.0 > 1.5\nsay "gt"\nend\nif 1.0 is 1.0\nsay "eq"\nend`,
    expect: ['lt', 'gt', 'eq'],
  },
  {
    name: 'transcendentals: sin/cos/exp/log/pow',
    src: `say fpow(2.0, 10.0)\nsay flog(fexp(1.0))\nsay fcos(0.0)\nsay fsin(0.0)`,
    expect: ['1024', '1', '1', '0'],
  },
  // ---- Milestone 7: file I/O ----
  {
    name: 'write_file + read_file round-trip',
    src: `set path to "/tmp/sdev-m7.txt"\nset status to write_file(path, "hello sdev")\nsay status\nsay read_file(path)`,
    expect: ['0', 'hello sdev'],
  },
  {
    name: 'read_file of missing path returns empty handle-safe path',
    src: `set s to read_file("/tmp/does-not-exist-sdev.xxx")\nsay length(s)`,
    expect: ['0'],
  },
  {
    name: 'Milestone 5r: and / or / not short-circuit',
    src: `set a to 1\nset b to 0\nif a and not b\n  say 11\nend\nif b or a\n  say 22\nend\nif not a\n  say 99\nend\nsay 5 > 1 and 5 < 10`,
    expect: ['11', '22', '1'],
  },
  {
    name: 'Milestone 5r: unary minus',
    src: `set x to 7\nsay -x\nsay 0 - -7\nsay -(2 * 3)\nsay -3 + 10`,
    expect: ['-7', '7', '-6', '7'],
  },
  {
    name: 'Milestone 5r: true / false / nothing literals',
    src: `set t to true\nset f to false\nset n to nothing\nsay t\nsay f\nsay n\nif t\n  say 1\nend\nif f\n  say 0\nend`,
    expect: ['1', '0', '0', '1'],
  },
  // ---- Milestone 5s: for each / break / continue / else if ----
  {
    name: 'Milestone 5s: for each over a list literal',
    src: `for each x in [10, 20, 30]\n  say x\nend`,
    expect: ['10', '20', '30'],
  },
  {
    name: 'Milestone 5s: for each with break and continue',
    src: `set xs to [1, 2, 3, 4, 5]\nfor each x in xs\n  if x is 2\n    continue\n  end\n  if x is 4\n    break\n  end\n  say x\nend\nsay 99`,
    expect: ['1', '3', '99'],
  },
  {
    name: 'Milestone 5s: nested for each',
    src: `for each a in [1, 2]\n  for each b in [10, 20]\n    say a * b\n  end\nend`,
    expect: ['10', '20', '20', '40'],
  },
  {
    name: 'Milestone 5s: break / continue inside while',
    src: `set i to 0\nwhile i < 10\n  set i to i + 1\n  if i is 3\n    continue\n  end\n  if i > 5\n    break\n  end\n  say i\nend`,
    expect: ['1', '2', '4', '5'],
  },
  {
    name: 'Milestone 5s: else if chain',
    src: `set a to 5\nif a is 1\n  say 100\nelse if a is 5\n  say 55\nelse\n  say 0\nend\nsay 7`,
    expect: ['55', '7'],
  },
  {
    name: 'Milestone 5s: for each inside a function',
    src: `to total with xs\n  set t to 0\n  for each v in xs\n    set t to t + v\n  end\n  return t\nend\nsay total([1, 2, 3, 4])`,
    expect: ['10'],
  },
  // ---- Milestone 5t: tomes ----
  {
    name: 'Milestone 5t: tome literal + string-key lookup',
    src: `set t to {"a": 1, "b": 2}\nsay t["a"]\nsay t["b"]\nsay length(t)`,
    expect: ['1', '2', '2'],
  },
  {
    name: 'Milestone 5t: bare identifier keys + string values',
    src: `set t to {name: "sdev", kind: "lang"}\nsay t["name"]\nsay t["kind"]`,
    expect: ['sdev', 'lang'],
  },
  {
    name: 'Milestone 5t: insert into an empty tome',
    src: `set t to {}\nset t["x"] to 9\nsay t["x"]\nsay length(t)`,
    expect: ['9', '1'],
  },
  {
    name: 'Milestone 5t: overwrite an existing key',
    src: `set t to {"a": 1}\nset t["a"] to 5\nsay t["a"]\nsay length(t)`,
    expect: ['5', '1'],
  },
  {
    name: 'Milestone 5t: keys() iteration',
    src: `set t to {"a": 1, "b": 2}\nfor each k in keys(t)\n  say k + "=" + str(t[k])\nend`,
    expect: ['a=1', 'b=2'],
  },
  {
    name: 'Milestone 5t: values() of a string-valued tome',
    src: `set t to {"a": "x", "b": "y"}\nfor each v in values(t)\n  say v\nend`,
    expect: ['x', 'y'],
  },
  {
    name: 'Milestone 5t: has() membership',
    src: `set t to {"a": 1}\nsay has(t, "a")\nsay has(t, "z")\nsay t["z"]`,
    expect: ['1', '0', '0'],
  },
  {
    name: 'Milestone 5t: tome passed through a function',
    src: `to lookup with t k\n  return t[k]\nend\nset t to {"q": 42}\nsay lookup(t, "q")`,
    expect: ['42'],
  },
  {
    name: 'Milestone 5t: growth past the initial capacity',
    src: `set t to {}\nset i to 0\nwhile i < 12\n  set t[str(i)] to i * i\n  set i to i + 1\nend\nsay length(t)\nsay t["11"]\nsay t["7"]`,
    expect: ['12', '121', '49'],
  },
  // ---- Milestone 5u: string + numeric standard library ----
  {
    name: 'Milestone 5u: upper / lower / trim',
    src: `say upper("abC")\nsay lower("AbC")\nsay trim("  hi  ") + "|"`,
    expect: ['ABC', 'abc', 'hi|'],
  },
  {
    name: 'Milestone 5u: substr / find / contains',
    src: `say substr("hello world", 6, 5)\nsay find("hello", "ll")\nsay find("hello", "z")\nsay contains("hello", "ell")`,
    expect: ['world', '2', '-1', '1'],
  },
  {
    name: 'Milestone 5u: split / join',
    src: `for each p in split("a,b,c", ",")\n  say p\nend\nsay join(split("a,b,c", ","), "-")`,
    expect: ['a', 'b', 'c', 'a-b-c'],
  },
  {
    name: 'Milestone 5u: replace / int',
    src: `say replace("a-b-a", "a", "X")\nsay int("42") + 1\nsay int("-7")`,
    expect: ['X-b-X', '43', '-7'],
  },
  {
    name: 'Milestone 5u: abs / min / max / sum / range',
    src: `say abs(0 - 5)\nsay min(3, 9)\nsay max(3, 9)\nsay sum(range(5))\nsay length(range(4))`,
    expect: ['5', '3', '9', '10', '4'],
  },
  {
    name: 'Milestone 5u: fceil / ffloor / fround / random',
    src: `say fceil(1.2)\nsay ffloor(1.8)\nsay fround(1.5)\nset r to random(10)\nif r < 10\n  say "ok"\nend`,
    expect: ['2', '1', '2', 'ok'],
  },
  {
    name: 'Milestone 5u: split pieces feed a tome',
    src: `set t to {}\nfor each p in split("a=1,b=2", ",")\n  set t[substr(p, 0, 1)] to int(substr(p, 2, 1))\nend\nsay t["a"]\nsay t["b"]`,
    expect: ['1', '2'],
  },
];


let failed = 0;
for (const c of cases) {
  try {
    const out = await runProgram(c.src, c.compiler);
    const ok = JSON.stringify(out) === JSON.stringify(c.expect);
    console.log(`${ok ? '✓' : '✗'} ${c.name}${c.compiler === 'bootstrap' ? '  [bootstrap]' : ''}`);
    if (!ok) { failed++; console.log('   expected:', c.expect); console.log('   got:     ', out); }
  } catch (e) {
    failed++;
    console.log(`✗ ${c.name} — threw: ${e.message}`);
  }
}
process.exit(failed);
