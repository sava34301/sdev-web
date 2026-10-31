// ─────────────────────────────────────────────────────────────────────────
// SDEV Self-Hosted Language Core Test Runner
//
// Runs all self-hosted compiler, VM, runtime, stdlib, subsystems, and
// parity test suites sequentially.
// ─────────────────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';

const suites = [
  { name: 'Toolchain (Lexer/Parser/Codegen)', cmd: 'node', args: ['bin/sdevhost.mjs', 'scripts/test-self-toolchain.sdev'] },
  { name: 'Driver Artifact', cmd: 'node', args: ['bin/sdevhost.mjs', 'scripts/test-driver-artifact.sdev'] },
  { name: 'Self-Hosted Lexer', cmd: 'node', args: ['bin/sdevhost.mjs', 'scripts/test-self-lexer.sdev'] },
  { name: 'Self-Hosted Parser', cmd: 'node', args: ['bin/sdevhost.mjs', 'scripts/test-self-parser.sdev'] },
  { name: 'Self-Hosted Codegen', cmd: 'node', args: ['bin/sdevhost.mjs', 'scripts/test-self-codegen.sdev'] },
  { name: 'Self-Hosted Stdlib v2', cmd: 'node', args: ['bin/sdevhost.mjs', 'scripts/test-selfhosted-stdlib.sdev'] },
  { name: 'Self-Hosted Subsystems', cmd: 'node', args: ['bin/sdevhost.mjs', 'scripts/test-selfhosted-subsystems.sdev'] },
  { name: 'Shim Fixed-Point (88 cases)', cmd: 'node', args: ['bin/sdevhost.mjs', 'scripts/test-shim-fixed-point.sdev'] },
  { name: 'Parity Gate (209 features)', cmd: 'node', args: ['scripts/run-ts.mjs', 'scripts/test-parity.ts'] },
  { name: 'Formal Formatter Suite (8 cases)', cmd: 'node', args: ['scripts/run-ts.mjs', 'scripts/test-formatter.ts'] },
  { name: 'Multi-Language Parity Suite (16 cases)', cmd: 'node', args: ['scripts/run-ts.mjs', 'scripts/test-multi-language-features.ts'] },
  { name: 'WASM Runtime Suite (73 cases)', cmd: 'node', args: ['scripts/test-wasm-runtime.mjs'] },
];

console.log('================================================================');
console.log('  Running SDEV Self-Hosted Language Core Test Suites');
console.log('================================================================\n');

let failed = 0;
for (const suite of suites) {
  console.log(`\n▶ [Running] ${suite.name}...`);
  const res = spawnSync(suite.cmd, suite.args, { encoding: 'utf8' });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.status !== 0) {
    console.error(`✗ [FAILED] ${suite.name} (exit code ${res.status})`);
    failed++;
    process.exit(res.status ?? 1);
  } else {
    console.log(`✓ [PASSED] ${suite.name}`);
  }
}

console.log('\n================================================================');
console.log(`  All ${suites.length} SDEV Self-Hosted Test Suites Passed Successfully!`);
console.log('================================================================\n');
