# Code Understanding Agent & Multi-Tier Local AI Brain

SDEV's **Understanding Agent** sits in front of the lexer, parser, and code generator across every entry point (Web IDE, Node CLI, WASM bridge). Its goal is simple: **let beginners write how they think, while guaranteeing that valid canonical programs always reach the compiler untouched (`asWritten()`).**

```text
user source ─▶ [directives] ─▶ [sdev:ai] ─▶ [board mask] ─▶ [SDEV rules + memory] ─▶ [3-tier AI brain] ─▶ canonical sdev
```

---

## 1. Architecture & Self-Hosted Engine (`lang/agent/`)

Per project architecture rules, the understander executes its **SDEV-written engine first**, falling back to TypeScript (`src/lang/agent/`) only when a line is uncertain or fails to parse:

| SDEV Module | Role |
| --- | --- |
| `lang/agent/understander.sdev` | Core natural-English-to-canonical-SDEV line/structure rules (via `src/lang/agent/sdev-engine.ts`). |
| `lang/agent/blocks.sdev` | Indentation-based block closer (`end` / `}` / `;;`) for incomplete user or LLM blocks. |
| `lang/agent/ai-dialect.sdev` | Translates `!#ai` (`sdev:ai`) files into canonical SDEV inside `begin()`, plus reverse formatting (`Open as sdev:ai`). |
| `lang/agent/parser_eval.sdev` | Pure-SDEV canonical tokenizer, recursive-descent parser, syntax validator, and tree-walking evaluator. |
| `lang/agent/project.sdev` | Cross-file symbol indexer collecting variables, functions, kinds, parameters, and loop bindings across workspace files. |
| `lang/agent/brain.sdev` | Directives parser, LLM JSON/code extractor, `sanitizeBrainOutput`, Micro-Brain intent classifier, NL solver, and fallback gates. |
| `lang/agent/math.sdev` | Plain-words arithmetic solver (number words to arithmetic expressions). |
| `lang/agent/tasks.sdev` | Everyday natural-language task handlers (reversing, sorting, case, dice, etc.). |
| `lang/agent/memory.sdev` | Program hashing (`understandKey`), cached line rewrites, learned word maps, and dialect promotion. |

### Core Safety Invariants

1. **Working Code Stays Byte-Identical (`asWritten()`):** Real SDEV keywords and runtime functions are never rewritten. A v1 file that parses cleanly with all names defined is left untouched; v2 files compile directly as written before the understander ever runs.
2. **Board Isolation (`board "<id>"`):** `maskBoardBlocks()` (`src/lang/agent/boards.ts`) sets `board` blocks aside before sdev rules run, routing them to the hardware reader (`src/lang/hardware/understand.ts`).
3. **Never Break Working Code:** If an understander reading fails to compile or execute, SDEV falls back to the author's original file. The regression gate `npm run test:understander-docs` verifies this across all documented code blocks.

---

## 2. File Directives & IDE Run Modes

Control the understander anywhere in a file with `!#agent:` directives:

| Directive | Behaviour |
| --- | --- |
| `!#agent:off` | Skip understanding completely; run the file as written. |
| `!#agent:on` | Always run the understander, even if the file already parses. |
| `!#agent:auto` | Default: understand only when the source has unknown syntax or unresolved words. |
| `!#agent:strict` | Use deterministic rules and memory only — never invoke an AI model. |
| `!#agent:local` | Restrict AI resolution to on-device models (Micro-Brain / WebLLM / local server). |
| `!#agent:online` | Allow escalation to the website's `sdev-agent` cloud edge function. |
| `!#agent:learn:off` | Do not persist newly learned words or line rewrites to memory. |

### IDE Controls

- **Run Program (`Ctrl+Enter`):** Runs through the standard understander + cache pipeline.
- **Run without Understanding (`Ctrl+Shift+Enter`):** Available in the Run menu, toolbar Run dropdown, and Command Palette. Executes the active file directly as written without reading or overwriting `understood` cache entries or triggering AI reconsider retries.
- **Re-understand (`fresh: true`):** Clears both whole-file and line-level cached memories for the current file and runs a clean reading.
- **Persistent Translations (`IdeFile.understood` / `FileSignature.translated`):** Successful rewrites are stored on the workspace file and inside `#⟨sdev⟩` signatures, surfacing a translation banner with a read-only **Preview** toggle and **Download translated (`.sdev`)**.

---

## 3. Three-Tier AI Brain Resolution

When deterministic SDEV/TS rules and memory still leave unresolved lines or plain-English program requests (e.g. `"make a window that is a calculator"`), SDEV resolves AI inference across three privacy-first tiers:

### Tier 1 — Pre-Baked WebGPU Micro-Brain & In-Browser WebLLM (Default, Free)

1. **Pre-Baked Micro-Brain (`src/lang/agent/micro-brain.ts`):** Sub-millisecond intent classifier (`12 × 64` weight table cached in browser `CacheStorage` with 0 MB extra download), speculative line translator, and natural-language problem solver (`solveNaturalLanguageRequest`) for common algorithmic tasks.
2. **In-Browser WebLLM (`src/lang/agent/browser-brain.ts`):** Runs **`Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC`** directly on the user's GPU via `@mlc-ai/web-llm` and WebGPU (temperature `0.05`, `top_p: 0.95`), cached permanently in browser storage after first load — zero install, zero cloud credits, works offline.

### Tier 2 — Local OpenAI-Compatible Model Server (Self-Hosted)

Configured in IDE **Settings → Code understander AI** (`AgentBrainSettings.tsx`) or via CLI env vars (`SDEV_AGENT_LOCAL_URL`, `SDEV_AGENT_LOCAL_MODEL`):

- **Quick Presets:** **LM Studio** (`http://localhost:1234`), **Ollama** (`http://127.0.0.1:11434`), **llama.cpp** (`http://localhost:8080`), **LocalAI** (`http://localhost:8080`).
- **Auto-Discovery & CORS Diagnostics (`probeLocalServer`):** Automatically normalizes `/v1` suffixes, enumerates loaded models, and reports actionable CORS hints if browser requests are blocked.
- Also powers offline **AI Doctor** code repairs (`callLocalFix` in `IdeAssistantPanel.tsx`).

### Tier 3 — Website AI Edge Function (`supabase/functions/sdev-agent/`)

Used when `!#agent:online` is set, when enabled in Settings, or as an automatic escalation fallback when local understanding produces unparseable output or runtime failures. All server-side calls route through `supabase/functions/_shared/ai.ts`, supporting any custom OpenAI-compatible provider via `SDEV_AI_API_KEY` / `SDEV_AI_BASE_URL` / `SDEV_AI_MODEL`.

> **Prompt Parity Invariant:** `src/lang/agent/brain-prompt.ts` and `supabase/functions/sdev-agent/index.ts` share synchronized system prompts and canonical few-shot examples.

---

## 4. Verification Suites

```bash
npm run test:engine             # SDEV-written understander engine (86 cases)
npm run test:agent              # Understander agent & memory (29 cases)
npm run test:brain              # Brain JSON parsing & sanitization
npm run test:brain-benchmarks   # Micro-Brain benchmarks & sanitizer suite
npm run test:understander-docs  # Regression gate over all documented examples
node scripts/run-ts.mjs scripts/test-local-brain.ts  # Local server endpoint & probe tests (12 cases)
```
