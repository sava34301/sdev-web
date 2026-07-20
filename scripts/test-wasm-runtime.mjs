// Standalone Node harness: compile + run via the seed WASM. No browser.
import { readFile } from 'node:fs/promises';
import { compile } from '../lang/bootstrap/compile.mjs';

const wasmBytes = await readFile('./public/wasm/sdev-seed.wasm');
const module = await WebAssembly.compile(wasmBytes);

const decoder = new TextDecoder();
async function runProgram(src) {
  const { bytecode, stringPool } = compile(src);
  const output = [];
  let mem;
  const inst = await WebAssembly.instantiate(module, {
    env: {
      host_say_i32: (n) => output.push(String(n)),
      host_say_str: (ptr, len) => output.push(decoder.decode(new Uint8Array(mem.buffer, ptr, len))),
      host_say_f64: (x) => {},
      host_fmath: (op,a,b) => [Math.sin,Math.cos,Math.tan,Math.exp,Math.log,(x,y)=>Math.pow(x,y)][op](a,b),
    },
  });
  mem = inst.exports.memory;
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
];

let failed = 0;
for (const c of cases) {
  try {
    const out = await runProgram(c.src);
    const ok = JSON.stringify(out) === JSON.stringify(c.expect);
    console.log(`${ok ? '✓' : '✗'} ${c.name}`);
    if (!ok) { failed++; console.log('   expected:', c.expect); console.log('   got:     ', out); }
  } catch (e) {
    failed++;
    console.log(`✗ ${c.name} — threw: ${e.message}`);
  }
}
process.exit(failed);
