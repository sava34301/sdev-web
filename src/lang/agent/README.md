# `src/lang/agent/`

The SDEV Code Understander (syntax-free SDEV): executes `lang/agent/understander.sdev` first via `sdev-engine.ts`, falls back to deterministic TypeScript rules (`repair.ts`, `sense.ts`, `vocabulary.ts`), isolates hardware `board` blocks (`boards.ts`), and connects to the 3-tier AI brain (`micro-brain.ts`, `browser-brain.ts` WebLLM, local model server, and online edge function).

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Files

| File | Purpose |
| :--- | :--- |
| `boards.ts` | TypeScript module (`boards.ts`). |
| `brain-prompt.ts` | Thin bridge to `brain_instructions` and `brain_input` in `lang/agent/brain.sdev`. |
| `brain.ts` | Thin bridge for the AI brain (endpoint normalization, output sanitization,. |
| `browser-brain.ts` | The understander's AI, running inside the user's browser (WebGPU, via. |
| `directives.ts` | TypeScript module (`directives.ts`). |
| `index.ts` | The understanding agent. |
| `memory.ts` | Agent memory store + thin bridge to `lang/agent/memory.sdev`. |
| `micro-brain.ts` | Thin bridge for the SDEV Pre-Baked WebGPU Micro-Brain (`lang/agent/brain.sdev`). |
| `promote.ts` | Thin bridge to `memory_promote_words` in `lang/agent/memory.sdev`. |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `repair.ts` | The rule brain. |
| `sdev-engine.ts` | Bridge to the self-hosted understander (lang/agent/understander.sdev),. |
| `sense.ts` | Does this file need the agent at all?. |
| `types.ts` | TypeScript module (`types.ts`). |
| `vocabulary.ts` | The agent's built-in vocabulary. |

<!-- FOLDER_INVENTORY_END -->
