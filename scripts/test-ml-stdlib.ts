/**
 * Milestone 13 & 15 — ML stdlib execution harness.
 *
 * The ML stack (lang/stdlib/ml/*.sdev) is written entirely in sdev. This
 * harness links those modules, installs the Node host bindings the stdlib
 * expects (read_file / write_file / http_get), and runs real programs on the
 * v1 interpreter so tensor math, autograd, batched forward passes,
 * accelerated matmul dispatch, and binary checkpoints are actually verified
 * instead of only type-checked by eye.
 *
 *   node scripts/run-ts.mjs scripts/test-ml-stdlib.ts
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { execute } from '../src/lang';
import { resolveLinks, type LinkableFile } from '../src/lang/tools/linker';

const resolveHostPath = (p: string) =>
  p.startsWith('/tmp/') ? join(tmpdir(), p.slice(5)) : p;

// ---- Node host bindings consumed by src/lang/builtins.ts ----
(globalThis as unknown as { __sdevHost: unknown }).__sdevHost = {
  readFile: (p: string) => readFileSync(resolveHostPath(p), 'utf8'),
  writeFile: (p: string, c: string) => writeFileSync(resolveHostPath(p), c),
  httpGet: (url: string) =>
    execFileSync('curl', ['-sL', '--max-time', '20', url], { encoding: 'utf8' }),
};

const ML_DIR = 'lang/stdlib/ml';
const files: LinkableFile[] = [
  ...readdirSync(ML_DIR)
    .filter((f) => f.endsWith('.sdev'))
    .map((f) => ({ name: f, content: readFileSync(join(ML_DIR, f), 'utf8') })),
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

// 7. Tokenizer round-trip: encode → decode must be the identity
run(
  'data: char vocab encode/decode round-trip',
  `link "data.sdev"
forge text be "hello sdev"
forge v be char_vocab(text)
forge ids be encode(v, text)
speak(decode(v, ids) + "|" + str(v.size))`,
  (out) => {
    const [round, size] = String(out[0] ?? '').split('|');
    if (round !== 'hello sdev') return `round-trip broke: ${round}`;
    return Number(size) === 8 ? null : `expected 8 distinct chars, got ${size}`;
  }
);

// 8. Softmax is a probability distribution
run(
  'tensor: softmax sums to 1',
  `link "tensor.sdev"
forge p be softmax(tensor([1.0, 2.0, 3.0, 4.0], [1, 4]))
forge s be 0.0
forge i be 0
cycle i < 4 :: be s be s + p.data[i] be i be i + 1 ;;
speak(str(s))`,
  (out) => (near(Number(out[0]), 1, 1e-9) ? null : `expected 1, got ${out[0]}`)
);

// 9. Transformer forward pass produces [tokens x vocab] logits
run(
  'transformer: gpt forward shape',
  `link "transformer.sdev"
forge m be gpt(8, 4, 8, 1)
forge logits be m.forward(tensor([1.0, 2.0, 3.0], [3]))
speak(str(logits.shape[0]) + "x" + str(logits.shape[1]) + "|" + str(measure(m.params) > 0))`,
  (out) => {
    const [shape, hasParams] = String(out[0] ?? '').split('|');
    if (shape !== '3x8') return `expected 3x8 logits, got ${shape}`;
    return hasParams === 'yep' || hasParams === 'true' ? null : 'model exposes no params';
  }
);

// 10. Sampling + generation extend the sequence deterministically in length
run(
  'transformer: generate extends the sequence',
  `link "transformer.sdev"
forge m be gpt(6, 4, 8, 1)
forge out be generate(m, [1.0, 2.0], 3)
speak(str(measure(out)))`,
  (out) => (Number(out[0]) === 5 ? null : `expected 5 tokens, got ${out[0]}`)
);

// 11. Accelerators degrade gracefully when no GPU/driver is present
run(
  'accelerators: cuda reports unavailable instead of crashing',
  `link "cuda.sdev"
forge dev be cuda_device_default()
speak(str(dev.ok))`,
  (out) => (out[0] === 'nope' || out[0] === 'false' || out[0] === 'yep' || out[0] === 'true'
    ? null
    : `expected a boolean availability flag, got ${out[0]}`)
);

// 12. Cross-entropy gradient matches the analytic softmax−onehot rule
run(
  'autograd: softmax cross-entropy gradient',
  `link "autograd.sdev"
tape_reset()
forge logits be tensor_grad([0.0, 0.0], [1, 2])
forge loss be d_softmax_ce(logits, [0.0])
backward(loss)
speak(str(loss.data[0]) + "|" + str(logits.grad[0]) + "|" + str(logits.grad[1]))`,
  (out) => {
    const [loss, g0, g1] = String(out[0] ?? '').split('|').map(Number);
    if (!near(loss, Math.log(2), 1e-6)) return `expected ln2 loss, got ${loss}`;
    if (!near(g0, -0.5, 1e-6) || !near(g1, 0.5, 1e-6)) return `bad grads ${g0}, ${g1}`;
    return null;
  }
);

// 13. Full LM training loop must reduce loss on a repeating pattern
run(
  'train: lm_fit lowers loss',
  `link "train.sdev"
forge v be char_vocab("abab")
forge ids be encode(v, "ababababab")
forge m be gpt(v.size, 4, 8, 1)
forge before be lm_loss(m, ids, 3)
forge r be lm_fit(m, ids, 3, 6, 0.05)
speak(str(before) + "|" + str(r.final))`,
  (out) => {
    const [before, after] = String(out[0] ?? '').split('|').map(Number);
    if (!Number.isFinite(before) || !Number.isFinite(after)) return 'non-finite loss';
    return after < before ? null : `loss did not improve: ${before} -> ${after}`;
  }
);

// 14. Sampling honours top-k filtering
run(
  'train: top-k sampling stays inside the allowed set',
  `link "train.sdev"
forge logits be tensor([0.0, 0.0, 9.0, 0.0], [4])
forge hits be 0
forge i be 0
cycle i < 20 ::
    either sample_topk(logits, 1.0, 1) equals 2 :: be hits be hits + 1 ;;
    be i be i + 1
;;
speak(str(hits))`,
  (out) => (Number(out[0]) === 20 ? null : `top-1 leaked: ${out[0]}/20`)
);

// 15. Checkpoints round-trip weights through the file system
run(
  'train: checkpoint save + load round-trip',
  `link "train.sdev"
forge m be gpt(5, 4, 8, 1)
save_checkpoint("/tmp/sdev-ckpt.txt", m)
forge original be m.params[0].data[0]
set m.params[0].data[0] to 123.5
load_checkpoint("/tmp/sdev-ckpt.txt", m)
speak(str(original) + "|" + str(m.params[0].data[0]))`,
  (out) => {
    const [a, b] = String(out[0] ?? '').split('|').map(Number);
    return near(a, b, 1e-9) ? null : `checkpoint mismatch: ${a} vs ${b}`;
  }
);

// 16. M15: Batched linear forward pass matches single-sample forward & supports autograd
run(
  'M15 nn: linear_forward_batch shape, equivalence & autograd',
  `link "nn.sdev"
tape_reset()
forge l be linear(3, 2)
forge x0 be tensor_grad([1.0, 2.0, 3.0], [1, 3])
forge x1 be tensor_grad([4.0, 5.0, 6.0], [1, 3])
forge bx be tensor_grad([1.0, 2.0, 3.0, 4.0, 5.0, 6.0], [2, 3])
forge y0 be l.forward(x0)
forge y1 be l.forward(x1)
tape_reset()
forge by be linear_forward_batch(l, bx)
forge loss be d_mse(by, zeros([2, 2]))
backward(loss)
forge grad_norm be abs(l.w.grad[0]) + abs(l.w.grad[1])
speak(str(by.shape[0]) + "x" + str(by.shape[1]) + "|" + str(by.data[0] - y0.data[0]) + "|" + str(by.data[2] - y1.data[0]) + "|" + str(grad_norm > 0.0))`,
  (out) => {
    const [shape, d0, d1, hasGrad] = String(out[0] ?? '').split('|');
    if (shape !== '2x2') return `expected 2x2 shape, got ${shape}`;
    if (!near(Number(d0), 0, 1e-9) || !near(Number(d1), 0, 1e-9)) {
      return `batch vs single mismatch: ${d0}, ${d1}`;
    }
    if (hasGrad !== 'yep' && hasGrad !== 'true') return `expected non-zero weight gradient, got ${hasGrad}`;
    return null;
  }
);

// 17. M15: Batched sequential forward pass through multi-layer MLP
run(
  'M15 nn: sequential_forward_batch multi-layer MLP',
  `link "nn.sdev"
forge l1 be linear(3, 4)
forge a1 be relu_layer()
forge l2 be linear(4, 2)
forge net be sequential([l1, a1, l2])
forge x0 be tensor([0.5, -1.0, 2.0], [1, 3])
forge x1 be tensor([-0.5, 1.5, 0.25], [1, 3])
forge bx be tensor([0.5, -1.0, 2.0, -0.5, 1.5, 0.25], [2, 3])
forge y0 be net.forward(x0)
forge y1 be net.forward(x1)
forge by be sequential_forward_batch(net, bx)
speak(str(by.shape[0]) + "x" + str(by.shape[1]) + "|" + str(by.data[0] - y0.data[0]) + "|" + str(by.data[3] - y1.data[1]))`,
  (out) => {
    const [shape, d0, d1] = String(out[0] ?? '').split('|');
    if (shape !== '2x2') return `expected 2x2 shape, got ${shape}`;
    if (!near(Number(d0), 0, 1e-9) || !near(Number(d1), 0, 1e-9)) {
      return `sequential batch mismatch: ${d0}, ${d1}`;
    }
    return null;
  }
);

// 18. M15: Batched GPT forward pass produces [B, T, vocab] logits matching single sequence
run(
  'M15 transformer: gpt_forward_batch [B, T, vocab] matches per-sequence forward',
  `link "transformer.sdev"
forge m be gpt(6, 4, 8, 1)
forge seq0 be [1.0, 2.0, 3.0]
forge seq1 be [0.0, 4.0, 2.0]
forge single0 be m.forward(tensor(seq0, [3]))
forge single1 be m.forward(tensor(seq1, [3]))
forge batch_out be gpt_forward_batch(m, [seq0, seq1])
forge shape_str be str(batch_out.shape[0]) + "x" + str(batch_out.shape[1]) + "x" + str(batch_out.shape[2])
forge diff0 be batch_out.data[0] - single0.data[0]
forge diff1 be batch_out.data[18] - single1.data[0]
forge diff_last be batch_out.data[35] - single1.data[17]
speak(shape_str + "|" + str(diff0) + "|" + str(diff1) + "|" + str(diff_last))`,
  (out) => {
    const [shape, d0, d1, dLast] = String(out[0] ?? '').split('|');
    if (shape !== '2x3x6') return `expected 2x3x6 shape, got ${shape}`;
    if (!near(Number(d0), 0, 1e-9) || !near(Number(d1), 0, 1e-9) || !near(Number(dLast), 0, 1e-9)) {
      return `gpt_forward_batch mismatch: ${d0}, ${d1}, ${dLast}`;
    }
    return null;
  }
);

// 19. M15: Accelerated matmul dispatch (best_matmul + pure SDEV fallback)
run(
  'M15 accelerators: accel_matmul fallback and custom accelerator dispatch',
  `link "nn.sdev"
forge a be tensor([1.0, 2.0, 3.0, 4.0], [2, 2])
forge b be tensor([2.0, 0.0, 1.0, 2.0], [2, 2])
forge c_fallback be accel_matmul(a, b)
forge calls be [0]
conjure mock_wg_matmul(ta, tb) ::
    set calls[0] to calls[0] + 1
    yield t_matmul(ta, tb)
;;
set_accel({ ok: nope }, void, { ok: yep, matmul: mock_wg_matmul })
forge c_accel be accel_matmul(a, b)
set_accel(void, void, void)
speak(str(c_fallback.data[0]) + "," + str(c_fallback.data[3]) + "|" + str(c_accel.data[0]) + "," + str(c_accel.data[3]) + "|" + str(calls[0]))`,
  (out) => {
    const [fb, ac, calls] = String(out[0] ?? '').split('|');
    if (fb !== '4,8') return `fallback matmul wrong: ${fb}`;
    if (ac !== '4,8') return `accelerated matmul wrong: ${ac}`;
    if (Number(calls) !== 1) return `expected 1 accelerator dispatch call, got ${calls}`;
    return null;
  }
);

// 20. M15: Binary checkpoint save_checkpoint_bin + load_checkpoint_bin round-trip
run(
  'M15 train: binary checkpoint SDEVML01 header, metadata & exact f64 round-trip',
  `link "train.sdev"
forge m be gpt(5, 4, 8, 1)
forge orig0 be m.params[0].data[0]
forge orig1 be m.params[1].data[2]
save_checkpoint_bin("/tmp/sdev-ckpt.bin", m, 42, 0.125)
forge raw be read_file("/tmp/sdev-ckpt.bin")
forge magic be split_text(raw, "\\n")[0]
set m.params[0].data[0] to -999.0
set m.params[1].data[2] to 777.0
forge meta be load_checkpoint_bin("/tmp/sdev-ckpt.bin", m)
speak(magic + "|" + str(meta.ok) + "|" + str(meta.version) + "|" + str(meta.step) + "|" + str(meta.loss) + "|" + str(orig0 - m.params[0].data[0]) + "|" + str(orig1 - m.params[1].data[2]))`,
  (out) => {
    const [magic, ok, ver, step, loss, d0, d1] = String(out[0] ?? '').split('|');
    if (magic !== 'SDEVML01') return `expected magic SDEVML01, got ${magic}`;
    if (ok !== 'yep' && ok !== 'true') return `expected ok=true, got ${ok}`;
    if (Number(ver) !== 1) return `expected version 1, got ${ver}`;
    if (Number(step) !== 42) return `expected step 42, got ${step}`;
    if (!near(Number(loss), 0.125, 1e-12)) return `expected loss 0.125, got ${loss}`;
    if (Number(d0) !== 0 || Number(d1) !== 0) return `expected bit-exact f64 restore, got diffs ${d0}, ${d1}`;
    return null;
  }
);

console.log(failures === 0 ? '\nAll ML stdlib checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
