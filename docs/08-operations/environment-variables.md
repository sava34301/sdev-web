# SDEV Environment Variables Reference (`docs/08-operations/environment-variables.md`)

<!-- AUTO-GENERATED: Source of truth .env.example, src/lang/agent/brain.ts, supabase/functions/_shared/ai.ts, cli/env.ts -->

This document describes all environment variables used across the SDEV Web Studio, Desktop App, CLI, and Supabase Edge Functions.

---

## 1. Client / Frontend (Vite)

These variables configure the browser IDE, authentication, hardware builder, and cloud storage connection to Supabase.

| Variable | Required | Description | Default / Example |
|---|---|---|---|
| `VITE_SUPABASE_URL` | **Yes** | Fully qualified URL of the Supabase project backend | `https://xyzcompany.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Yes** | Client publishable/anon API key | `eyJhbGciOi...` |
| `VITE_SUPABASE_PROJECT_ID` | Optional | Supabase project identifier for telemetry and deep-links | `xyzcompany` |
| `VITE_SDEV_AGENT_LOCAL_URL` | Optional | Override default local AI server URL in browser IDE | `http://localhost:11434/v1` |
| `VITE_SDEV_AGENT_LOCAL_MODEL` | Optional | Override default local AI model name in browser IDE | `qwen2.5-coder:1.5b` |
| `VITE_ARDUINO_BUILD_URL` | Optional | Custom Arduino C++ build server URL used by the Hardware panel | `http://localhost:8765` |

---

## 2. Local AI Brain, CLI & Desktop (`src/lang/agent/brain.ts`, `cli/env.ts`)

These variables steer the code understanding agent, CLI local store, and Electron builds on the user's computer without consuming cloud credits.

| Variable | Required | Description | Default / Example |
|---|---|---|---|
| `SDEV_HOME` | No | Directory where the CLI stores `store.json`, `session.json`, and cached libraries | `~/.sdev` |
| `SDEV_SEED_WASM` | No | Explicit path to `sdev-seed.wasm` for the CLI | `bin/sdev-seed.wasm` |
| `SDEV_RUNTIME_S` | No | Explicit path to `runtime.s` for native ELF builds (set automatically by VS Code ext) | `bin/runtime.s` |
| `SDEV_RELEASES_URL` | No | Custom `releases.json` URL checked by `sdev update` | `https://web.sdev.codes/releases.json` |
| `SDEV_NO_UPDATE_CHECK` | No | Set to `1` to disable daily CLI update checks | `0` |
| `SDEV_PASSWORD` | No | Non-interactive password for `sdev auth login` | `—` |
| `SDEV_AGENT_LOCAL_URL` | No | Base URL of an OpenAI-compatible local model server (LM Studio, Ollama, llama.cpp) | `http://127.0.0.1:1234/v1` or `http://127.0.0.1:11434` |
| `SDEV_AGENT_LOCAL_MODEL` | No | Specific model name loaded in the local server | `qwen2.5-coder:7b` |
| `SDEV_AGENT_ONLINE` | No | Set to `1` to enable fallback to the website's cloud AI function | `0` |
| `SDEV_DESKTOP_DEV` | No | Set to `1` when running the Electron desktop app in local development | `1` |
| `SDEV_ELECTRON` | No | Set to `1` during `vite build` so asset paths use `./` for Electron `file://` loading | `1` |
| `SDEV_SITE` | No | Override target URL loaded by the Electron desktop shell | `https://web.sdev.codes` |

---

## 3. Server-Side AI Gateway (`supabase/functions/_shared/ai.ts`)

Per architecture rules, server-side AI calls route through `_shared/ai.ts` using any OpenAI-compatible provider.

| Variable | Required | Description | Default / Example |
|---|---|---|---|
| `SDEV_AI_API_KEY` | Optional | Bearer API key for your custom AI provider (OpenAI, DeepSeek, OpenRouter, Groq) | `sk-...` |
| `SDEV_AI_BASE_URL` | Optional | Custom base URL for the chat completions endpoint | `https://api.openai.com/v1` |
| `SDEV_AI_MODEL` | Optional | Default model identifier for code translation | `gpt-4o-mini` |
| `SDEV_AI_MODEL_FAST` | Optional | Fast-tier model for lightweight tasks | `gpt-4o-mini` |
| `SDEV_AI_MODEL_STRONG` | Optional | High-reasoning model for complex conversions | `gpt-4o` |
| `SDEV_AI_REASONING` | Optional | Reasoning effort flag (`low`, `medium`, `high`) | `low` |
| `SDEV_AI_DISABLE_LEGACY` | Optional | Set to `1` to strictly forbid fallback to legacy hosted gateway | `0` |

---

## 4. Hardware Firmware Cloud Compiler

Used by `supabase/functions/compile-firmware` to compile Arduino C++ sketches to AVR/RP2040 binaries.

| Variable | Required | Description | Example |
|---|---|---|---|
| `ARDUINO_BUILD_URL` | Optional | HTTPS endpoint of an `arduino-cli` build daemon | `https://builder.sdev.dev/compile` |
| `ARDUINO_BUILD_KEY` | Optional | Secret authorization token for the builder | `secret-auth-key` |
