# SDEV Machine Learning & LLM Stdlib

A complete ML/LLM stack written in sdev itself. Everything lives under
`lang/stdlib/ml/` and runs on both the WASM (browser) and Native ASM
(desktop CLI) tracks, gated on the Phase-A prerequisites (Milestone 6
floats, Milestone 7 file I/O + `http_get`).

## Modules

| File | Purpose |
| --- | --- |
| `tensor.sdev` | Core tensor primitive (data + shape), element-wise ops, `matmul`, activations (`relu`, `sigmoid`, `softmax`), losses (`mse`, `cross_entropy`), initializers (`zeros`, `ones`, `randn`). |
| `autograd.sdev` | Reverse-mode autograd. Global tape, differentiable ops (`d_add`, `d_mul`, `d_matmul`, `d_relu`, `d_mse`), `backward(out)`, `sgd_step(params, lr)`. |
| `nn.sdev` | High-level layers (`linear`, `relu_layer`, `sequential`) and a `fit(model, xs, ys, epochs, lr)` training loop. |
| `transformer.sdev` | Decoder-only transformer: `embedding`, `layer_norm`, `attention_head`, `transformer_block`, `gpt(vocab, dim, hidden, layers)`, plus `generate(model, prompt, max_new)` for autoregressive sampling. |
| `train.sdev` | Language-model training (M14): `lm_batches`, `lm_step`, `lm_fit`, `lm_loss`, `perplexity`, `sample_topk`, `lm_generate`, `lm_complete`, `save_checkpoint` / `load_checkpoint`. |
| `data.sdev` | Dataset I/O (`load_text`, `save_text`), char-level tokenizer (`char_vocab`, `encode`, `decode`), web crawler (`crawl`, `crawl_many`), teacher-model distillation helpers, and `save_model`. |
| `self_modify.sdev` | Gated self-modification: `self_read`, `self_propose` (routes through a review hook), `mine_demand` for feature-demand scraping, `update_docs`, and `rewrite_weights` for out-of-band parameter surgery. |

## Quick start

```sdev
link "stdlib/ml/nn.sdev"

// Learn y = 2x + 1
forge xs be gather()
forge ys be gather()
forge i be 0
cycle i < 32 ::
    forge v be i * 0.1
    pluck(xs, tensor([v], [1, 1]))
    pluck(ys, tensor([2.0 * v + 1.0], [1, 1]))
    be i be i + 1
;;

forge model be sequential([
    linear(1, 8),
    relu_layer(),
    linear(8, 1)
])

fit(model, xs, ys, 100, 0.05)
```

## Training a tiny LLM

```sdev
link "stdlib/ml/transformer.sdev"
link "stdlib/ml/data.sdev"

forge text be load_text("corpus.txt")
forge vocab be char_vocab(text)
forge ids be encode(vocab, text)

forge model be gpt(vocab.size, 64, 128, 2)  // dim=64, ffn=128, 2 blocks

// train_step / fit works the same as MLPs — feed context windows.
```

## Teacher-model distillation

```sdev
link "stdlib/ml/data.sdev"

forge prompts be ["explain gravity", "what is a compiler?"]
forge pairs be distill_batch(
    "https://ai.gateway.lovable.dev/v1/chat",
    "$LOVABLE_API_KEY",
    prompts
)
// pairs now holds { prompt, target } — train your local model to imitate.
```

## Self-modification (gated)

```sdev
link "stdlib/ml/self_modify.sdev"

// Install a review hook — every proposed edit passes through this.
set_review_hook(conjure(path, body) :: yield confirm("Apply edit to " + path + "?") ;;)

forge src be self_read("src/lang/interpreter.ts")
// ... model generates a patched version in `patched` ...
self_propose("src/lang/interpreter.ts", patched)

// Mine feature demand from GitHub / Reddit / HN
forge topics be mine_demand([
    "https://api.github.com/repos/rust-lang/rust/issues",
    "https://www.reddit.com/r/programminglanguages/top.json"
])
```

## Backend acceleration

The ML stdlib runs unaccelerated on the seed VM today. Later milestones
add hardware backends without changing the sdev API surface:

- **M9 — FFI:** call `libcudart`, `libc`, and Metal from the Native track.
- **M10 — WebGPU:** browser tensors dispatch through `navigator.gpu`.
- **M11 — CUDA:** `matmul` / `attention` fast paths bind to cuBLAS + FlashAttention.

## Safety notes

- `self_modify.sdev` is off by default. Nothing writes to disk until
  `set_review_hook` is called with a function that returns `yep`.
- `http_get` in the browser runtime is a stub (sync HTTP is unavailable
  in-page); use the Native/Electron builds for live training data.
- Weights are stored in host memory only — no telemetry, no upload.

## Training a language model end to end (M14)

`train.sdev` closes the loop: real next-token cross-entropy with a proper
backward pass, Adam with global-norm gradient clipping, temperature/top-k
sampling, evaluation, and plain-text checkpoints.

```sdev
link "stdlib/ml/train.sdev"

forge text be load_text("corpus.txt")
forge v be char_vocab(text)
forge ids be encode(v, text)

forge model be gpt(v.size, 32, 64, 2)
forge result be lm_fit(model, ids, 16, 20, 0.01)   // block, epochs, lr
speak("final loss: " + str(result.final))
speak("perplexity: " + str(perplexity(model, ids, 16)))

save_checkpoint("model.ckpt", model)
speak(lm_complete(model, v, "hello", 40, 0.8, 5))  // prompt, tokens, temp, k
```

### API

- `lm_batches(ids, block)` → `{ xs, ys, block, count }` sliding-window pairs.
- `lm_step(model, opt, ctx, targets, lr)` → scalar loss for one update.
- `lm_fit(model, ids, block, epochs, lr)` → `{ history, final, opt }`.
- `lm_loss(model, ids, block)` / `perplexity(model, ids, block)` — evaluation.
- `sample_topk(logits, temperature, k)` → token id.
- `lm_generate(model, prompt_ids, max_new, temperature, k)` → token list.
- `lm_complete(model, vocab, prompt, max_new, temperature, k)` → text.
- `save_checkpoint(path, model)` / `load_checkpoint(path, model)` — one
  parameter tensor per line as `shape|values`; requires host file I/O.

Autograd gained the pieces this needs: `d_softmax_ce(logits, targets)` with
its `bw_sce` backward rule, `zero_grads`, `clip_grads(params, max_norm)`,
and `adam_new` / `adam_step`.
