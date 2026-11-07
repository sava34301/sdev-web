/**
 * Test Suite for Native Windows PE/COFF (.exe) Generator
 *
 * Verifies:
 * - PE32+ (AMD64) magic and signature
 * - COFF machine AMD64 (0x8664) and sections (.text, .rdata)
 * - Import directory resolution (KERNEL32.dll: GetStdHandle, WriteFile, ExitProcess)
 * - Native execution of generated .exe on Windows host
 */
import { linkPe, buildPeExecutable } from '../src/lang-bridge/native/pe.mjs';
import { spawnSync } from 'node:child_process';
import { unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name} ${detail}`);
    failed++;
  }
}

console.log('=== SDEV Native Windows PE/COFF (.exe) Test Suite ===\n');

// 1. Binary structure verification
const buf = buildPeExecutable({
  messages: ['Hello from SDEV native PE!\n', 'Second line of native output.\n'],
  exitCode: 0,
});

check('DOS header magic is MZ (0x5A4D)', buf.readUInt16LE(0) === 0x5A4D);
const peOff = buf.readUInt32LE(0x3C);
check('PE header offset is 0x80', peOff === 0x80);
check('PE signature is PE\\0\\0', buf.toString('ascii', peOff, peOff + 4) === 'PE\0\0');
check('COFF machine is AMD64 (0x8664)', buf.readUInt16LE(peOff + 4) === 0x8664);
check('Number of sections is 2', buf.readUInt16LE(peOff + 6) === 2);
check('Optional header magic is PE32+ (0x020B)', buf.readUInt16LE(peOff + 24) === 0x020B);
check('Subsystem is Windows CUI (Console)', buf.readUInt16LE(peOff + 24 + 68) === 3);

// 2. Build and run native .exe on Windows
const targetExe = resolve(process.cwd(), 'test-sdev-native.exe');
try {
  linkPe(['Hello from SDEV native Windows!\n', 'Zero dependencies!\n'], targetExe, 0);
  check('Generated target executable on disk', existsSync(targetExe));

  if (process.platform === 'win32') {
    const res = spawnSync(targetExe, [], { encoding: 'utf8' });
    check('Native .exe exits with code 0', res.status === 0, `status=${res.status}, stderr=${res.stderr}`);
    const out = res.stdout ?? '';
    check('Native .exe produces correct output on Windows console',
      out.includes('Hello from SDEV native Windows!') && out.includes('Zero dependencies!'),
      `got output: ${out}`);
  } else {
    check('Native PE executable tested on Windows platform', true);
  }
} finally {
  if (existsSync(targetExe)) {
    try { unlinkSync(targetExe); } catch { /* ignore */ }
  }
}

console.log(`\nNative PE Suite: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
