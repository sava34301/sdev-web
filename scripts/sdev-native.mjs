#!/usr/bin/env node
// SDEV native compiler CLI.
//
//   node scripts/sdev-native.mjs prog.sdev [-o prog] [--emit-asm]
//
// Reads a .sdev source file, generates x86-64 assembly via
// lang/native/codegen-x64.mjs, and (unless --emit-asm) assembles + links
// it into a static ELF using lang/native/link.mjs.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { generateAsm } from '../lang/native/codegen-x64.mjs';
import { link } from '../lang/native/link.mjs';

function usage() {
  console.error('usage: sdev-native <file.sdev> [-o out] [--emit-asm] [--as PATH] [--ld PATH]');
  process.exit(2);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) usage();
  let src = null, out = null, emitAsm = false, asBin, ldBin;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o') out = argv[++i];
    else if (a === '--emit-asm') emitAsm = true;
    else if (a === '--as') asBin = argv[++i];
    else if (a === '--ld') ldBin = argv[++i];
    else if (a.startsWith('-')) usage();
    else src = a;
  }
  if (!src) usage();

  const source = readFileSync(src, 'utf8');
  const asm = generateAsm(source);

  const base = basename(src).replace(/\.sdev$/, '');
  const outBin = out || resolve(dirname(src), base);
  const asmPath = outBin + '.s';
  writeFileSync(asmPath, asm);

  if (emitAsm) {
    console.log(`wrote ${asmPath}`);
    return;
  }
  link(asm, outBin, { as: asBin, ld: ldBin, tmpDir: dirname(outBin) });
  console.log(`wrote ${outBin}`);
}

main();
