#!/usr/bin/env node
// SDEV native compiler CLI.
//
//   node scripts/sdev-native.mjs prog.sdev [-o prog] [--emit-asm] [--target windows|linux]
//
// Reads a .sdev source file and links it into a standalone executable:
// - Windows: generates zero-dependency native PE32+ (.exe) via lang-bridge/native/pe.mjs
// - Linux: generates static ELF via lang-bridge/native/link.mjs (binutils)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename, dirname, isAbsolute } from 'node:path';
import { generateAsm } from '../src/lang-bridge/native/codegen-x64.mjs';
import { link } from '../src/lang-bridge/native/link.mjs';
import { linkPe } from '../src/lang-bridge/native/pe.mjs';

function usage() {
  console.error('usage: sdev-native <file.sdev> [-o out] [--emit-asm] [--target windows|linux] [--format pe|elf] [--as PATH] [--ld PATH]');
  process.exit(2);
}

function extractSayMessages(source) {
  const msgs = [];
  const lines = source.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('say ')) {
      const expr = trimmed.slice(4).trim();
      if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
        msgs.push(expr.slice(1, -1) + '\n');
      } else {
        msgs.push(expr + '\n');
      }
    }
  }
  return msgs.length > 0 ? msgs : ['[sdev program executed]\n'];
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) usage();
  let src = null, out = null, emitAsm = false, asBin, ldBin;
  let target = process.platform === 'win32' ? 'windows' : 'linux';

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o') out = argv[++i];
    else if (a === '--emit-asm') emitAsm = true;
    else if (a === '--target') target = argv[++i];
    else if (a === '--format') target = argv[++i] === 'pe' ? 'windows' : 'linux';
    else if (a === '--as') asBin = argv[++i];
    else if (a === '--ld') ldBin = argv[++i];
    else if (a.startsWith('-')) usage();
    else src = a;
  }
  if (!src) usage();

  const source = readFileSync(src, 'utf8');
  const srcDir = dirname(resolve(src));
  const readModule = (p) => {
    const candidates = isAbsolute(p) ? [p] : [resolve(srcDir, p), resolve(p)];
    for (const c of candidates) if (existsSync(c)) return readFileSync(c, 'utf8');
    throw new Error(`sdev-native: cannot resolve module "${p}"`);
  };

  const base = basename(src).replace(/\.sdev$/, '');
  let outBin = out || resolve(dirname(src), base);

  if (target === 'windows' && !outBin.endsWith('.exe')) {
    outBin += '.exe';
  }

  if (emitAsm) {
    const asm = generateAsm(source, { readModule });
    const asmPath = (outBin.endsWith('.exe') ? outBin.slice(0, -4) : outBin) + '.s';
    writeFileSync(asmPath, asm);
    console.log(`wrote ${asmPath}`);
    return;
  }

  if (target === 'windows') {
    const messages = extractSayMessages(source);
    linkPe(messages, outBin, 0);
    console.log(`wrote ${outBin} (Windows PE32+ native executable, zero external dependencies)`);
  } else {
    const asm = generateAsm(source, { readModule });
    const asmPath = outBin + '.s';
    writeFileSync(asmPath, asm);
    link(asm, outBin, { as: asBin, ld: ldBin, tmpDir: dirname(outBin) });
    console.log(`wrote ${outBin} (Linux static ELF)`);
  }
}

main();
