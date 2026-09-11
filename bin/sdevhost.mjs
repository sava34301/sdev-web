// ─────────────────────────────────────────────────────────────────────────
// SDEV host — the irreducible JavaScript kernel.
//
// This is the ONLY JavaScript allowed in the SDEV toolchain. Everything a
// build script, probe or test used to do in JS is now written in SDEV and
// executed here: this file compiles a `.sdev` program with the self-hosted
// compiler, loads it into the hand-written seed VM, and answers the VM's
// host calls (files, process, shell, compiler oracle).
//
//   node bin/sdevhost.mjs scripts/test-self-toolchain.sdev [args...]
//
// Host protocol — everything rides on `read_file` / `write_file`, because
// the seed VM's import table is fixed:
//
//   read_file("sdev:args")            → CLI args, one per line
//   read_file("sdev:ls:<dir>")        → directory entries, one per line
//   read_file("sdev:exec:<cmd>")      → "<exit>\n<combined output>"
//   read_file("sdev:compile:self:<p>")→ "<bytecode hex> <pool hex>"
//   read_file("sdev:compile:boot:<p>")→ same, via the bootstrap oracle
//   read_file("sdev:driver:baked")    → checked-in driver artifact hex
//   read_file("sdev:driver:fresh")    → driver rebuilt from the oracle
//   write_file("sdev:exit:<code>", "")→ set the process exit code
//   write_file("sdev:err", text)      → write to stderr
//   any other path                    → the real filesystem
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { compile as selfCompile } from '../lang/compiler/compile-self.mjs';

const decoder = new TextDecoder();
const encoder = new TextEncoder();

const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');

let bootstrapCompile = null;
async function boot() {
  if (!bootstrapCompile) {
    bootstrapCompile = (await import('../lang/bootstrap/compile.mjs')).compile;
  }
  return bootstrapCompile;
}

let buildDriver = null;
async function driverBuilder() {
  if (!buildDriver) {
    buildDriver = (await import('../scripts/build-driver.mjs')).buildDriver;
  }
  return buildDriver;
}

// Anything the SDEV program may ask for that needs async work is resolved
// up front, because the seed VM itself is synchronous.
async function prefetch(scriptSrc, args) {
  const table = new Map();
  const put = (k, v) => table.set(k, v);

  const wanted = new Set();
  for (const m of scriptSrc.matchAll(/"(sdev:(?:compile|driver):[^"]*)"/g)) wanted.add(m[1]);
  // Paths can also be built at runtime from a list of targets; SDEV programs
  // declare those with a `# host-prefetch: <key>` comment.
  for (const m of scriptSrc.matchAll(/#\s*host-prefetch:\s*(\S+)/g)) wanted.add(m[1]);

  for (const key of wanted) {
    if (key === 'sdev:driver:baked') {
      const a = await import('../lang/compiler/driver-artifact.mjs');
      const b64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));
      put(key, `${hex(b64(a.DRIVER_BYTECODE_B64))} ${hex(b64(a.DRIVER_POOL_B64))}`);
      continue;
    }
    if (key === 'sdev:driver:fresh') {
      const build = await driverBuilder();
      const { bytecode, stringPool } = await build();
      put(key, `${hex(bytecode)} ${hex(stringPool)}`);
      continue;
    }
    const m = /^sdev:compile:(self|boot):(.+)$/.exec(key);
    if (!m) continue;
    const [, mode, path] = m;
    try {
      const src = readFileSync(path, 'utf8');
      const r = mode === 'self' ? await selfCompile(src) : (await boot())(src);
      put(key, `${hex(r.bytecode)} ${hex(r.stringPool)}`);
    } catch (e) {
      put(key, `error ${e?.message ?? e}`);
    }
  }
  put('sdev:args', args.join('\n'));
  return table;
}

async function main() {
  const [scriptPath, ...args] = process.argv.slice(2);
  if (!scriptPath) {
    console.error('usage: node bin/sdevhost.mjs <program.sdev> [args...]');
    process.exit(2);
  }
  const scriptSrc = readFileSync(scriptPath, 'utf8');
  const table = await prefetch(scriptSrc, args);

  const program = await selfCompile(scriptSrc);
  const wasmBytes = readFileSync(new URL('../public/wasm/sdev-seed.wasm', import.meta.url));
  const module = await WebAssembly.compile(wasmBytes);

  let mem;
  let allocStr;
  let exitCode = 0;
  let line = '';
  const emit = (text) => {
    line += text;
    const parts = line.split('\n');
    line = parts.pop();
    for (const p of parts) process.stdout.write(p + '\n');
  };
  const blob = (bytes) => {
    const dst = allocStr(bytes.length);
    new Uint8Array(mem.buffer, dst + 4, bytes.length).set(bytes);
    return dst;
  };

  const hostRead = (path) => {
    if (table.has(path)) return table.get(path);
    if (path.startsWith('sdev:ls:')) {
      try { return readdirSync(path.slice(8)).join('\n'); } catch { return ''; }
    }
    if (path.startsWith('sdev:exec:')) {
      const cmd = path.slice(10);
      try {
        const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        return `0\n${out}`;
      } catch (e) {
        return `${e.status ?? 1}\n${(e.stdout ?? '') + (e.stderr ?? '')}`;
      }
    }
    if (path.startsWith('sdev:')) return '';
    try { return readFileSync(path, 'utf8'); } catch { return ''; }
  };

  const inst = await WebAssembly.instantiate(module, {
    env: {
      host_say_i32: (n) => emit(String(n) + '\n'),
      host_say_str: (ptr, len) => emit(decoder.decode(new Uint8Array(mem.buffer, ptr, len)) + '\n'),
      host_say_f64: (x) => emit(String(x) + '\n'),
      host_fmath: (op, a, b) => [Math.sin, Math.cos, Math.tan, Math.exp, Math.log, (x, y) => Math.pow(x, y)][op](a, b),
      host_read_file: (ptr, len) => {
        const path = decoder.decode(new Uint8Array(mem.buffer, ptr, len));
        return blob(encoder.encode(hostRead(path)));
      },
      host_write_file: (pPtr, pLen, dPtr, dLen) => {
        const path = decoder.decode(new Uint8Array(mem.buffer, pPtr, pLen));
        const data = decoder.decode(new Uint8Array(mem.buffer, dPtr, dLen));
        if (path.startsWith('sdev:exit:')) { exitCode = Number(path.slice(10)) | 0; return 0; }
        if (path === 'sdev:err') { process.stderr.write(data); return 0; }
        try { writeFileSync(path, data); return 0; } catch { return -1; }
      },
      host_http_get: () => 0,
    },
  });

  mem = inst.exports.memory;
  allocStr = inst.exports.alloc_str;
  const memU8 = new Uint8Array(mem.buffer);
  memU8.set(program.stringPool, 0);
  const codeBase = inst.exports.code_base();
  memU8.set(program.bytecode, codeBase);
  inst.exports.set_prog_len(program.bytecode.length);
  inst.exports.run();
  if (line) process.stdout.write(line + '\n');
  process.exit(exitCode);
}

main().catch((e) => { console.error(e); process.exit(1); });
