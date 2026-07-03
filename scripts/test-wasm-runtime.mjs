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
