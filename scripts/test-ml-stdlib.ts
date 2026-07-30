/**
 * Milestone 13 — ML stdlib execution harness.
 *
 * The ML stack (lang/stdlib/ml/*.sdev) is written entirely in sdev. This
 * harness links those modules, installs the Node host bindings the stdlib
 * expects (read_file / write_file / http_get), and runs real programs on the
 * v1 interpreter so tensor math, autograd and training are actually verified
 * instead of only type-checked by eye.
 *
 *   bun run scripts/test-ml-stdlib.ts
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { execute } from '../src/lang';
import { resolveLinks, type LinkableFile } from '../src/lang/linker';

// ---- Node host bindings consumed by src/lang/builtins.ts ----
(globalThis as unknown as { __sdevHost: unknown }).__sdevHost = {
  readFile: (p: string) => readFileSync(p, 'utf8'),
  writeFile: (p: string, c: string) => writeFileSync(p, c),
  httpGet: (url: string) =>
    execFileSync('curl', ['-sL', '--max-time', '20', url], { encoding: 'utf8' }),
};

const ML_DIR = 'lang/stdlib/ml';
const files: LinkableFile[] = [
  ...readdirSync(ML_DIR)
    .filter((f) => f.endsWith('.sdev'))
    .map((f) => ({ name: f, content: readFileSync(join(ML_DIR, f), 'utf8') })),
  { name: 'webgpu.sdev', content: readFileSync('lang/stdlib/webgpu.sdev', 'utf8') },
  { name: 'ffi.sdev', content: readFileSync('lang/stdlib/ffi.sdev', 'utf8') },
];

let failures = 0;

function run(name: string, program: string, expect: (out: string[]) => string | null) {
  const linked = resolveLinks(program, files, { entryName: '<test>' });
  const result = execute(linked);
  if (!result.success) {
    console.log(`✗ ${name}: ${result.error}`);
    failures++;
    return;
  }
  const problem = expect(result.output);
  if (problem) {
    console.log(`✗ ${name}: ${problem}\n   output: ${JSON.stringify(result.output)}`);
    failures++;
  } else {
    console.log(`✓ ${name}`);
  }
}

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;

// 1. Tensor core: shape + elementwise + matmul
run(
  'tensor core: matmul 2x3 · 3x2',
  `link "tensor.sdev"
forge a be tensor([1.0, 2.0, 3.0, 4.0, 5.0, 6.0], [2, 3])
forge b be tensor([1.0, 0.0, 0.0, 1.0, 1.0, 1.0], [3, 2])
forge c be matmul(a, b)
speak(str(c.data[0]) + "," + str(c.data[1]) + "," + str(c.data[2]) + "," + str(c.data[3]))`,
  (out) => (out[0] === '4,5,10,11' ? null : `expected 4,5,10,11 got ${out[0]}`)
);

// 2. Autograd: d/dx of x*x at x=3 must be 6
run(
  'autograd: gradient of x²',
  `link "autograd.sdev"
tape_reset()
forge x be tensor_grad([3.0], [1, 1])
forge y be d_mul(x, x)
backward(y)
speak(str(x.grad[0]))`,
  (out) => (near(Number(out[0]), 6, 1e-6) ? null : `expected 6, got ${out[0]}`)
);

// 3. Training: a linear layer must reduce loss over epochs
run(
  'nn: linear layer loss decreases',
  `link "nn.sdev"
forge model be linear(1, 1)
forge xs be gather()
forge ys be gather()
forge i be 0
cycle i < 8 ::
    pluck(xs, tensor_grad([1.0 * i], [1, 1]))
    pluck(ys, tensor_grad([2.0 * i + 1.0], [1, 1]))
    be i be i + 1
;;
forge first be train_step(model, xs[0], ys[0], 0.01)
forge e be 0
cycle e < 40 ::
    forge j be 0
    cycle j < measure(xs) ::
        train_step(model, xs[j], ys[j], 0.01)
        be j be j + 1
    ;;
    be e be e + 1
;;
forge last be train_step(model, xs[0], ys[0], 0.01)
speak(str(first) + "|" + str(last))`,
  (out) => {
    const [first, last] = String(out[0] ?? '').split('|').map(Number);
    if (!Number.isFinite(first) || !Number.isFinite(last)) return 'non-finite loss';
    return last <= first ? null : `loss grew: ${first} → ${last}`;
  }
);

// 4. Host file I/O round-trip through the self-modification layer
run(
  'self_modify: read_file sees the real source tree',
  `link "self_modify.sdev"
forge body be self_read("lang/stdlib/ml/nn.sdev")
speak(str(measure(body) > 100))`,
  (out) => (out[0] === 'yep' || out[0] === 'true' ? null : `expected truthy, got ${out[0]}`)
);

// 5. Self-modification stays gated until a review hook is installed
run(
  'self_modify: writes refused without a review hook',
  `link "self_modify.sdev"
speak(str(self_propose("lang/stdlib/ml/nn.sdev", "// clobbered")))`,
  (out) => (out[0] === 'nope' || out[0] === 'false' ? null : `expected refusal, got ${out[0]}`)
);

// 6. Auto-evolve whitelist rejects anything outside the source map
run(
  'auto_evolve: whitelist blocks unknown paths',
  `link "auto_evolve.sdev"
speak(str(is_allowed("lang/runtime/v2.js")) + "|" + str(is_allowed("/etc/passwd")))`,
  (out) => {
    const s = String(out[0] ?? '').replace(/true/g, 'yep').replace(/false/g, 'nope');
    return s === 'yep|nope' ? null : `expected yep|nope, got ${out[0]}`;
  }
);

console.log(failures === 0 ? '\nAll ML stdlib checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
