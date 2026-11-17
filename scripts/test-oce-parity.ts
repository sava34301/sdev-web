// OCE parity gate: the causal engine must give the same answers everywhere.
//   bun scripts/test-oce-parity.ts
// - SDEV v2 on the self-hosted compiler + seed VM (scripts/test-oce.sdev)
// - SDEV v2 compiled to a native Linux executable (when `as`/`ld` exist)
// - classic sdev on the browser runtime and on the Python runtime
//   (scripts/test-oce-classic.sdev, same checks)
// - the gravity demo in v2, classic, and `!#ai` syntax
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execute, executeAsync } from '../src/lang/index';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log(`ok   ${name}`); } else { fail++; console.log(`FAIL ${name}${detail ? `\n${detail}` : ''}`); }
};
const lines = (s: string) => s.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0).join('\n');
const run = (cmd: string, args: string[]) => {
  try { return execFileSync(cmd, args, { encoding: 'utf8', timeout: 300_000 }); } catch (e) { return String((e as { stdout?: string }).stdout ?? '') + String(e); }
};
const classic = (path: string) => {
  const r = execute(readFileSync(path, 'utf8'), {} as never);
  return (r.success ? '' : `ERROR ${r.error}\n`) + (r.output ?? []).join('\n');
};

const v2 = lines(run('node', ['bin/sdevhost.mjs', 'scripts/test-oce.sdev']));
check('v2 suite passes', v2.endsWith('oce: 35 passed, 0 failed'), v2.slice(-300));
check('classic (browser runtime) = v2', lines(classic('scripts/test-oce-classic.sdev')) === v2);
check('classic (Python runtime) = v2', lines(run('python3', ['public/sdev-interpreter.py', 'scripts/test-oce-classic.sdev'])) === v2);

const g = lines(run('node', ['bin/sdevhost.mjs', 'examples/oce/gravity.sdev']));
check('gravity demo learns gravity', g.includes('if supported == 0 then vel_z += -10'), g);
check('gravity classic (browser) = v2', lines(classic('examples/oce/gravity-classic.sdev')) === g);
check('gravity classic (Python) = v2', lines(run('python3', ['public/sdev-interpreter.py', 'examples/oce/gravity-classic.sdev'])) === g);
const ai = await executeAsync(readFileSync('examples/oce/gravity-ai.sdev', 'utf8'), {} as never);
check('gravity !#ai (browser) = v2', lines((ai.output ?? []).join('\n')) === g, ai.error ?? '');

const hasBinutils = (() => { try { execFileSync('as', ['--version'], { stdio: 'ignore' }); return true; } catch { return false; } })();
if (hasBinutils) {
  const dir = mkdtempSync(join(tmpdir(), 'oce-native-'));
  const exe = join(dir, 'oce');
  run('node', ['scripts/sdev-native.mjs', 'scripts/test-oce.sdev', '-o', exe]);
  check('native Linux build = v2', existsSync(exe) && lines(run(exe, [])) === v2);
} else {
  console.log('skip native Linux build (no assembler on this machine)');
}

console.log(`\noce parity: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
