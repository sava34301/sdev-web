# `src/lang/tools/`

Developer tooling written against the core language layer: micro-benchmarking & latency profiler (`benchmark.ts`), code formatter (`formatter.ts`), multi-file `link` bundler (`linker.ts`), static diagnostic linter (`linter.ts`), literate markdown notebook engine (`notebook.ts`), and 26-language natural keyword translators (`translator.ts`, `translator-v2.ts`).

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Files

| File | Purpose |
| :--- | :--- |
| `benchmark.ts` | SDEV High-Precision Micro-Benchmarking & Profiling Engine (`src/lang/benchmark.ts`). |
| `formatter.ts` | Lightweight sdev formatter — reindents based on `::` opens and `;;` closes,. |
| `linker.ts` | SDEV module linker — resolves `link "file.sdev"` directives by inlining. |
| `linter.ts` | SDEV Target-Aware Static Linter & Diagnostic Engine. |
| `notebook.ts` | SDEV Literate Markdown Notebook Engine (`src/lang/notebook.ts`). |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `translator-v2.ts` | sdev translator — v2 surface layer. |
| `translator.ts` | sdev built-in language translator. |

<!-- FOLDER_INVENTORY_END -->
