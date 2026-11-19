// ─────────────────────────────────────────────────────────────────────────
// SDEV host — the irreducible JavaScript kernel.
//
// This is the host that runs SDEV programs from the command line. Everything
// a build script, probe or test does is written in SDEV and executed here:
// this file compiles a `.sdev` program with the self-hosted compiler, loads
// it into the seed VM, and answers the VM's host calls (files, process,
// shell, compiler access). It contains no language logic.
//
//   node bin/sdevhost.mjs scripts/test-self-toolchain.sdev [args...]
//
// Host protocol — everything rides on `read_file` / `write_file`, because
// the seed VM's import table is fixed:
//
//   read_file("sdev:args")                → CLI args, one per line
//   read_file("sdev:ls:<dir>")            → directory entries, one per line
//   read_file("sdev:exec:<cmd>")          → "<exit>\n<combined output>"
//   read_file("sdev:compile:self:<p>")    → "<bytecode hex> <pool hex>" (shipped compiler)
//   read_file("sdev:compile:stage2:<p>")  → same, compiled by the compiler that
//                                           lang/compiler/driver.sdev builds today
//   read_file("sdev:compile:boot:<p>")    → same, via the JavaScript reference
//                                           oracle (differential testing only)
//   read_file("sdev:driver:baked")        → checked-in compiler build, hex
//   write_file("sdev:append:<path>", t)   → append t to a real file
//   write_file("sdev:exit:<code>", "")    → set the process exit code
//   write_file("sdev:err", text)          → write to stderr
//   any other path                        → the real filesystem
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, appendFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { compile as selfCompile, compileWith, bakedDriver } from '../src/lang-bridge/compile-self.mjs';

const decoder = new TextDecoder();
const encoder = new TextEncoder();

const hex = (u8) => Buffer.from(u8).toString('hex');

let oracleCompile = null;
async function oracle() {
  if (!oracleCompile) {
    oracleCompile = (await import('../src/lang-bridge/oracle/compile.mjs')).compile;
  }
  return oracleCompile;
}

// Recursively collect `use "..."` / `summon "..."` modules referenced by src.
function collectModules(src, seen = {}) {
  for (const m of src.matchAll(/^\s*(?:use|summon)\s+"([^"]+)"/gm)) {
    const p = m[1];
    if (!Object.prototype.hasOwnProperty.call(seen, p)) {
      try {
        const modSrc = readFileSync(p, 'utf8');
        seen[p] = modSrc;
        collectModules(modSrc, seen);
      } catch {
        // Leave missing modules to host/compiler error handling.
      }
    }
  }
  return seen;
}

// The compiler that the current lang/compiler/driver.sdev produces, built by
// the shipped compiler. Used for stage-2 / stage-3 fixed-point checks.
let stage2 = null;
async function stage2Driver() {
  if (!stage2) {
    const src = readFileSync('lang/compiler/driver.sdev', 'utf8');
    stage2 = await selfCompile(src);
  }
  return stage2;
}

let v1Drv = null;
async function v1Driver() {
  if (!v1Drv) {
    const src = readFileSync('lang/compiler/v1_driver.sdev', 'utf8');
    v1Drv = await selfCompile(src, collectModules(src));
  }
  return v1Drv;
}

let v1SelfDrv = null;
async function v1SelfDriver() {
  if (!v1SelfDrv) {
    const src = readFileSync('lang/compiler/v1_self.sdev', 'utf8');
    v1SelfDrv = await compileWith(await v1Driver(), src, collectModules(src));
  }
  return v1SelfDrv;
}

let v1SelfSt2Drv = null;
async function v1SelfStage2Driver() {
  if (!v1SelfSt2Drv) {
    const src = readFileSync('lang/compiler/v1_self.sdev', 'utf8');
    v1SelfSt2Drv = await compileWith(await v1SelfDriver(), src, collectModules(src));
  }
  return v1SelfSt2Drv;
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
      const d = bakedDriver();
      put(key, `${hex(d.bytecode)} ${hex(d.stringPool)}`);
      continue;
    }
    if (key === 'sdev:driver:fresh') {
      const src = readFileSync('lang/compiler/driver.sdev', 'utf8');
      const r = (await oracle())(src);
      put(key, `${hex(r.bytecode)} ${hex(r.stringPool)}`);
      continue;
    }
    if (key === 'sdev:driver:v1') {
      try {
        const d = await v1Driver();
        put(key, `${hex(d.bytecode)} ${hex(d.stringPool)}`);
      } catch (e) {
        put(key, `error ${e?.message ?? e}`);
      }
      continue;
    }
    if (key === 'sdev:driver:v1-self') {
      try {
        const d = await v1SelfDriver();
        put(key, `${hex(d.bytecode)} ${hex(d.stringPool)}`);
      } catch (e) {
        put(key, `error ${e?.message ?? e}`);
      }
      continue;
    }
    if (key === 'sdev:driver:v1-self-stage2') {
      try {
        const d = await v1SelfStage2Driver();
        put(key, `${hex(d.bytecode)} ${hex(d.stringPool)}`);
      } catch (e) {
        put(key, `error ${e?.message ?? e}`);
      }
      continue;
    }
    const m = /^sdev:compile:(self|stage2|boot|v1|v1-self|v1-self-stage2):(.+)$/.exec(key);
    if (!m) continue;
    const [, mode, path] = m;
    try {
      const src = readFileSync(path, 'utf8');
      const r = mode === 'self' ? await selfCompile(src, collectModules(src))
        : mode === 'stage2' ? await compileWith(await stage2Driver(), src, collectModules(src))
        : mode === 'v1' ? await compileWith(await v1Driver(), src, collectModules(src))
        : mode === 'v1-self' ? await compileWith(await v1SelfDriver(), src, collectModules(src))
        : mode === 'v1-self-stage2' ? await compileWith(await v1SelfStage2Driver(), src, collectModules(src))
        : (await oracle())(src, collectModules(src));
      put(key, `${hex(r.bytecode)} ${hex(r.stringPool)}`);
    } catch (e) {
      put(key, `error ${e?.message ?? e}`);
    }
  }
  put('sdev:args', args.join('\n'));
  return table;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  let v1Mode = false;
  if (rawArgs[0] === '--v1') {
    v1Mode = true;
    rawArgs.shift();
  }
  const [scriptPath, ...args] = rawArgs;
  if (!scriptPath) {
    console.error('usage: node bin/sdevhost.mjs [--v1] <program.sdev> [args...]');
    process.exit(2);
  }
  const scriptSrc = readFileSync(scriptPath, 'utf8');
  if (scriptSrc.split(/\r?\n/, 1)[0].trim() === '#!sdev v1') {
    v1Mode = true;
  }
  const table = await prefetch(scriptSrc, args);

  // Validate with both the reference compiler and the self-hosted compiler's
  // error channel so any syntax, arity, symbol or capacity error is reported.
  let program;
  try {
    if (v1Mode) {
      program = await compileWith(await v1Driver(), scriptSrc, collectModules(scriptSrc));
    } else {
      (await oracle())(scriptSrc);
      program = await selfCompile(scriptSrc);
    }
  } catch (e) {
    const msg = String(e?.message ?? e).replace(/^\[sdev v2\] line \d+: /, '');
    process.stderr.write(`sdev: ${scriptPath}: ${msg}\n`);
    process.exit(1);
  }
  // The seed VM is a static asset under public/wasm — read by path at
  // runtime, never imported, so no bundler ever pulls the binary into a chunk.
  const seedAssetPath = '../public/wasm/sdev-seed' + '.wasm';
  const wasmBytes = readFileSync(new URL(seedAssetPath, import.meta.url));
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
        const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024, windowsHide: true });
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
        if (path.startsWith('sdev:append:')) {
          try { appendFileSync(path.slice(12), data); return 0; } catch { return -1; }
        }
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
