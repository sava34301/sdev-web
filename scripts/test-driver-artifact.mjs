// Milestone 5p — the checked-in driver artifact must stay honest.
//
// Re-derives the driver bytecode from the JS bootstrap (build-time oracle)
// and byte-compares it with `lang/compiler/driver-artifact.mjs`. If codegen.sdev
// changes and nobody re-ran `node scripts/build-driver.mjs`, this fails.

import { buildDriver } from './build-driver.mjs';
import { DRIVER_BYTECODE_B64, DRIVER_POOL_B64 } from '../lang/compiler/driver-artifact.mjs';
import { compile as selfCompile } from '../lang/compiler/compile-self.mjs';

const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const fromB64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
};

const fresh = await buildDriver();
const bakedBc = fromB64(DRIVER_BYTECODE_B64);
const bakedPool = fromB64(DRIVER_POOL_B64);

check('driver bytecode matches the bootstrap oracle',
  eq([...fresh.bytecode], [...bakedBc]),
  `(baked=${bakedBc.length}, fresh=${fresh.bytecode.length})`);
check('driver string pool matches the bootstrap oracle',
  eq([...fresh.stringPool], [...bakedPool]),
  `(baked=${bakedPool.length}, fresh=${fresh.stringPool.length})`);

// The bootstrap-free shim must still compile real programs.
const cases = [
  'say 1 + 2',
  'set x to 5\nwhile x > 0\n  set x to x - 1\nend\nsay x',
  'to twice with n\n  return n * 2\nend\nsay twice(21)',
  'say "hello"',
];
for (const src of cases) {
  const r = await selfCompile(src);
  check(`shim compiles: ${JSON.stringify(src.slice(0, 24))}`,
    r.bytecode.length > 0, `bc=${r.bytecode.length}`);
}

console.log(failures === 0 ? '\nDriver artifact verified.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
