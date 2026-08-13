// Assemble + link a generated .s into a Linux x86-64 static ELF.
// Uses `as` and `ld` from binutils. On this sandbox they're pulled via
// `nix run nixpkgs#binutils`. On a real desktop just have binutils on PATH.

import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Resolve runtime.s next to this module. When this file is bundled to CJS
// (the VS Code extension does that), import.meta.url is unavailable, so fall
// back to __dirname or an explicit SDEV_RUNTIME_S override.
const RUNTIME_S = (() => {
  if (process.env.SDEV_RUNTIME_S) return resolve(process.env.SDEV_RUNTIME_S);
  try {
    const u = import.meta.url;
    if (u) return resolve(new URL('./runtime.s', u).pathname);
  } catch { /* bundled */ }
  return resolve(typeof __dirname !== 'undefined' ? __dirname : '.', 'runtime.s');
})();

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) {
    const msg = `${cmd} ${args.join(' ')} failed (${r.status}):\n${r.stderr || r.stdout}`;
    throw new Error(msg);
  }
  return r.stdout;
}

/**
 * @param {string} asmText  generated x86-64 GAS assembly
 * @param {string} outPath  final ELF path
 * @param {object} opts
 * @param {string} [opts.as]  as binary (default: "as")
 * @param {string} [opts.ld]  ld binary (default: "ld")
 * @param {string} [opts.tmpDir]  scratch dir
 */
export function link(asmText, outPath, opts = {}) {
  const as = opts.as || 'as';
  const ld = opts.ld || 'ld';
  const tmp = opts.tmpDir || dirname(outPath);
  mkdirSync(tmp, { recursive: true });

  const progS = resolve(tmp, '_sdev_prog.s');
  const progO = resolve(tmp, '_sdev_prog.o');
  const rtO   = resolve(tmp, '_sdev_runtime.o');

  writeFileSync(progS, asmText);
  run(as, ['--64', '-o', progO, progS]);
  run(as, ['--64', '-o', rtO, RUNTIME_S]);
  run(ld, ['-o', outPath, rtO, progO]);
  return outPath;
}
