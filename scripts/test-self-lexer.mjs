// Runs the self-hosted lexer (lang/compiler/lexer.sdev) through the seed
// WASM VM on a handful of sample sources, and diffs its streamed tokens
// against a JS reference implementation of the same rules.
//
// This is the first Milestone-5 checkpoint: the lexer is authored in SDEV,
// compiled by the bootstrap JS compiler to seed bytecode, and executed by
// the hand-written WAT VM. No lexer logic lives in JS.
//
//   npm exec -- node scripts/test-self-lexer.mjs
import { readFile } from 'node:fs/promises';
import { compile } from '../lang/bootstrap/compile.mjs';

const wasmBytes  = await readFile('./public/wasm/sdev-seed.wasm');
const lexerSrc   = await readFile('./lang/compiler/lexer.sdev', 'utf8');
const module     = await WebAssembly.compile(wasmBytes);
const decoder    = new TextDecoder();

function escapeForSdev(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
}

async function runLexer(source) {
  // Splice a `set src to "..."` stub in front of the lexer, then call it.
  const program = `set src to "${escapeForSdev(source)}"\n${lexerSrc}\nlex(src)\n`;
  const { bytecode, stringPool } = compile(program);
  const output = [];
  let mem;
  const inst = await WebAssembly.instantiate(module, {
    env: {
      host_say_i32: (n) => output.push(String(n)),
      host_say_str: (ptr, len) => output.push(decoder.decode(new Uint8Array(mem.buffer, ptr, len))),
      host_say_f64: (x) => output.push(String(x)),
      host_fmath: (op,a,b) => [Math.sin,Math.cos,Math.tan,Math.exp,Math.log,(x,y)=>Math.pow(x,y)][op](a,b),
      host_read_file: () => 0,
      host_write_file: () => -1,
      host_http_get: () => 0,
    },
  });
  mem = inst.exports.memory;
  new Uint8Array(mem.buffer).set(stringPool, 0);
  const codeBase = inst.exports.code_base();
  new Uint8Array(mem.buffer).set(bytecode, codeBase);
  inst.exports.set_prog_len(bytecode.length);
  inst.exports.run();
  return output;
}

// Reference: the exact same rules, in JS.
function refLex(src) {
  const isDigit = (c) => c >= 48 && c <= 57;
  const isAlpha = (c) => c === 95 || (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
  const isAlnum = (c) => isDigit(c) || isAlpha(c);
  const out = [];
  let i = 0, n = src.length;
  while (i < n) {
    const c = src.charCodeAt(i);
    if (c === 32 || c === 9 || c === 13) { i++; continue; }
    if (c === 10) { out.push('NL'); i++; continue; }
    if (isDigit(c)) {
      let j = i;
      while (j < n && isDigit(src.charCodeAt(j))) j++;
      out.push('N=' + parseInt(src.slice(i, j), 10));
      i = j; continue;
    }
    if (isAlpha(c)) {
      let j = i;
      while (j < n && isAlnum(src.charCodeAt(j))) j++;
      out.push('I=' + src.slice(i, j));
      i = j; continue;
    }
    if (c === 34) {
      let j = i + 1;
      while (j < n && src.charCodeAt(j) !== 34) j++;
      out.push('S=' + src.slice(i + 1, j));
      i = j + 1; continue;
    }
    out.push('P=' + src[i]);
    i++;
  }
  out.push('EOF');
  return out;
}

const cases = [
  { name: 'empty', src: '' },
  { name: 'hello', src: 'say "hello"\nsay 42' },
  { name: 'arithmetic', src: 'set x to 12 + 34 * 5\nsay x' },
  { name: 'function + call', src: 'to fib with n\nif n < 2\nreturn n\nend\nreturn fib(n - 1) + fib(n - 2)\nend\nsay fib(10)' },
  { name: 'lists + index', src: 'set xs to [1, 2, 3]\nset xs[1] to 99\nsay xs[1]' },
  { name: 'punctuation zoo', src: 'a = b + (c * d) - e / f % g\n' },
];

let failed = 0;
for (const c of cases) {
  try {
    const got = await runLexer(c.src);
    const expected = refLex(c.src);
    const ok = JSON.stringify(got) === JSON.stringify(expected);
    console.log(`${ok ? '✓' : '✗'} ${c.name}`);
    if (!ok) {
      failed++;
      console.log('   expected:', expected);
      console.log('   got:     ', got);
    }
  } catch (e) {
    failed++;
    console.log(`✗ ${c.name} — threw: ${e.message}`);
  }
}
process.exit(failed);
