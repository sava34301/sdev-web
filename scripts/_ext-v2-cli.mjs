// Entry point bundled into extension/interpreter/sdev-v2.cjs.
//
//   node sdev-v2.cjs program.sdev
//
// Compiles the source with the self-hosted sdev compiler (driver artifact
// running on the seed VM) and executes the resulting bytecode on the same VM.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile, setSeedLoader } from '../lang/compiler/compile-self.mjs';

const decoder = new TextDecoder();

function here() {
  try { return dirname(fileURLToPath(import.meta.url)); }
  catch { return __dirname; }
}

setSeedLoader(async () => readFileSync(join(here(), 'sdev-seed.wasm')));

async function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: sdev-v2 <file.sdev>'); process.exit(2); }
  const src = readFileSync(file, 'utf8');

  const { bytecode, stringPool } = await compile(src);
  const wasmBytes = readFileSync(join(here(), 'sdev-seed.wasm'));
  const module = await WebAssembly.compile(wasmBytes);

  let mem, allocStr;
  const write = (s) => process.stdout.write(s + '\n');

  const inst = await WebAssembly.instantiate(module, {
    env: {
      host_say_i32: (n) => write(String(n)),
      host_say_str: (ptr, len) => write(decoder.decode(new Uint8Array(mem.buffer, ptr, len))),
      host_say_f64: (x) => write(String(x)),
      host_fmath: (op, a, b) => [Math.sin, Math.cos, Math.tan, Math.exp, Math.log, (x, y) => Math.pow(x, y)][op](a, b),
      host_read_file: (ptr, len) => {
        try {
          const path = decoder.decode(new Uint8Array(mem.buffer, ptr, len));
          const buf = readFileSync(path);
          const dst = allocStr(buf.length);
          new Uint8Array(mem.buffer, dst + 4, buf.length).set(buf);
          return dst;
        } catch { return allocStr(0); }
      },
      host_write_file: (pPtr, pLen, dPtr, dLen) => {
        try {
          const path = decoder.decode(new Uint8Array(mem.buffer, pPtr, pLen));
          writeFileSync(path, new Uint8Array(mem.buffer, dPtr, dLen).slice());
          return 0;
        } catch { return -1; }
      },
      host_http_get: (ptr, len) => {
        try {
          const url = decoder.decode(new Uint8Array(mem.buffer, ptr, len));
          const out = execFileSync('curl', ['-sSL', '--max-time', '15', url], { maxBuffer: 8 * 1024 * 1024 });
          const dst = allocStr(out.length);
          new Uint8Array(mem.buffer, dst + 4, out.length).set(out);
          return dst;
        } catch { return 0; }
      },
    },
  });

  mem = inst.exports.memory;
  allocStr = inst.exports.alloc_str;
  const memU8 = new Uint8Array(mem.buffer);
  memU8.set(stringPool, 0);
  const codeBase = inst.exports.code_base();
  memU8.set(bytecode, codeBase);
  inst.exports.set_prog_len(bytecode.length);
  inst.exports.run();
}

main().catch((e) => { console.error(String(e && e.message ? e.message : e)); process.exit(1); });
