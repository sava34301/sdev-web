// Probe: run the self-hosted codegen through the shim, but tap into what
// happens during compile. Specifically, feed codegen.sdev as the user
// source and look at fn_names[0] (how many functions the SDEV compiler
// registered when compiling itself).

import { readFile } from 'node:fs/promises';
import { compile as bootCompile } from '../lang/bootstrap/compile.mjs';

const wasmBytes = await readFile('./public/wasm/sdev-seed.wasm');
const codegenSrc = await readFile('./lang/compiler/codegen.sdev', 'utf8');
const wasmModule = await WebAssembly.compile(wasmBytes);
const decoder = new TextDecoder();

// Load driver template
const shimSrc = await readFile('./lang/compiler/compile-self.mjs', 'utf8');
// Extract INLINE_LEX + DRIVE_CODEGEN using markers
const inlineLex = shimSrc.match(/const INLINE_LEX = `\n([\s\S]*?)`;/)[1];
const drive     = shimSrc.match(/const DRIVE_CODEGEN = `\n([\s\S]*?)`;/)[1];

function escapeForSdev(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
}

// Modified driver: dump diagnostic markers BEFORE the bc/pool dump
const diagDrive = drive.replace(
  /say bc\[0\]/,
  `say 900001
say tk_count
say 900002
say fn_names[0]
say 900003
say bc[0]`
);

const userSrc = codegenSrc;  // <-- feeding codegen.sdev to itself
const program =
  `set src to "${escapeForSdev(userSrc)}"\n` +
  codegenSrc + '\n' + inlineLex + '\n' + diagDrive + '\n';

const { bytecode, stringPool } = bootCompile(program);
const out = [];
let mem;
const inst = await WebAssembly.instantiate(wasmModule, {
  env: {
    host_say_i32: (n) => out.push(String(n)),
    host_say_str: (ptr, len) => out.push(decoder.decode(new Uint8Array(mem.buffer, ptr, len))),
  },
});
mem = inst.exports.memory;
new Uint8Array(mem.buffer).set(stringPool, 0);
const codeBase = inst.exports.code_base();
new Uint8Array(mem.buffer).set(bytecode, codeBase);
inst.exports.set_prog_len(bytecode.length);
inst.exports.run();

// Print the diagnostic prefix
console.log('First 12 dumped values:', out.slice(0, 12));
