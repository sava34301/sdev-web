# `lang/stdlib/`

Top-level SDEV standard library directory containing `v2/` core modules, `ml/` machine learning modules, C ABI Foreign Function Interface (`ffi.sdev`), WebGPU compute (`webgpu.sdev`), and the self-hosted test assertion kit (`testkit.sdev`).

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Subfolders

| Subfolder | Purpose |
| :--- | :--- |
| [`ml/`](./ml/) | Pure-SDEV Machine Learning & LLM standard library: N-dimensional tensors (`tensor.sdev`), reverse-mode autograd (`autograd.sdev`), neural layers & batched forward passes (`nn.sdev`), GPT/Transformer models (`transformer.sdev`), training loops & `SDEVML01` binary checkpoints (`train.sdev`), tokenizers (`data.sdev`), CUDA acceleration (`cuda.sdev`), and gated self-evolution (`self_modify.sdev`, `auto_evolve.sdev`). |
| [`v2/`](./v2/) | 22 pure-SDEV v2 standard library modules compiled directly by the self-hosted v2 compiler: `bits`, `buffer`, `func`, `graphics`, `json`, `list`, `math`, `matrix`, `mem`, `oce`, `pyparity`, `random`, `regex`, `sql`, `test`, `text`, `time`, `tome`, `turtle`, `types`, `ui`, and `web`. |

### Files

| File | Purpose |
| :--- | :--- |
| `ffi.sdev` | sdev Stdlib — Foreign Function Interface (Milestone 9). |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `testkit.sdev` | testkit — assertions and host helpers for SDEV-authored build scripts. |
| `webgpu.sdev` | lang/stdlib/webgpu.sdev |

<!-- FOLDER_INVENTORY_END -->
