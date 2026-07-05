// Assemble + link a generated .s into a Linux x86-64 static ELF.
// Uses `as` and `ld` from binutils. On this sandbox they're pulled via
// `nix run nixpkgs#binutils`. On a real desktop just have binutils on PATH.

import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const RUNTIME_S = resolve(new URL('./runtime.s', import.meta.url).pathname);

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
