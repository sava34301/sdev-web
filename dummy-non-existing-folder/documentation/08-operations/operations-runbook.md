# SDEV Operations Runbook

This operations runbook outlines deployment processes, runtime infrastructure, environment configurations, and incident response procedures for the SDEV ecosystem (Web IDE, Edge Functions, Desktop App, and CLI).

---

## 1. Architecture & Component Inventory

| Component | Technology | Hosting / Distribution | Core Dependencies |
| :--- | :--- | :--- | :--- |
| **Web IDE & Landing** | React 18, Vite, Tailwind CSS, CodeMirror 6 | Vercel / Netlify / Static CDN | WebGPU, WebAssembly, Web Serial, WebUSB |
| **Edge Functions** | Deno, Supabase Edge Functions | Supabase Cloud | `sdev-agent`, `sdev-chat`, `sdev-fix`, `compile-firmware`, `draft-dialect`, `translate-*`, `mcp` |
| **On-Device Brain** | Micro-Brain + MLC WebLLM (`@mlc-ai/web-llm`) | In-browser WebGPU runtime | Browser WebGPU API (Chrome 113+) |
| **Desktop IDE** | Electron, Node.js | Linux / macOS / Windows binaries | Local filesystem, native shell (`as`/`ld`) |
| **CLI & Zero-Host** | `bin/sdev.mjs` (Node.js) & `bin/sdev-vm` (native C) | npm / GitHub Releases / native OS | Node.js v18+ (optional with `bin/sdev-vm`) |
| **Hardware Cloud Build** | Cloud compiler microservice (`compile-firmware`) | Containerized Arduino CLI / Wokwi | `arduino-cli`, GCC avr/arm toolchains |

---

## 2. Deployment Procedures

### 2.1 Web Application (Vite / React)
The frontend builds as an optimized Single Page Application (SPA).

1. **Build verification**:
   ```bash
   npm run build
   ```
   Artifacts are output to `dist/`.
2. **Deploy via Vercel**:
   ```bash
   vercel --prod
   ```
3. **Deploy via Netlify**:
   ```bash
   netlify deploy --prod --dir=dist
   ```

### 2.2 Supabase Edge Functions
Server-side functions handle optional cloud AI inference (`sdev-agent`, `sdev-chat`, `sdev-fix`, `draft-dialect`, `translate-*`), remote hardware compilation (`compile-firmware`), and the OAuth MCP server (`mcp`).

1. **Deploying AI & Tooling Functions**:
   ```bash
   supabase functions deploy sdev-agent sdev-chat sdev-fix mcp compile-firmware --project-ref <PROJECT_ID>
   ```
   Verify portable MCP bundle before deploying (`node --test scripts/test-mcp-deployment.mjs`).
2. **Setting Edge Secrets**:
   ```bash
   supabase secrets set SDEV_AI_API_KEY="your-key" SDEV_AI_BASE_URL="https://api.openai.com/v1" SDEV_AI_MODEL="gpt-4o-mini"
   ```

### 2.3 Desktop Application Packaging
Electron binaries are packaged via `electron-packager`:
```bash
npm run desktop:package
```
Artifacts are generated in `electron-release/`.

### 2.4 Creating a Unified Release
To publish an update across the IDE, CLI, extension, and desktop apps:
1. Update version number and changelog in `release.json`.
2. Run the release pipeline:
   ```bash
   node scripts/release.mjs
   ```
3. This regenerates:
   - Standalone CLI bundles in `bin/`
   - Release archive assets in `public/downloads/`
   - Canonical manifest in `public/releases.json`

---

## 3. AI Understander & Brain Configuration

SDEV supports three tiers of AI model resolution:

### Tier 1: Zero-Cost WebGPU Local Browser Brain (Default)
- **Runtime**: `@mlc-ai/web-llm` running inside the browser tab using WebGPU.
- **Model**: `Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC` (or configured lightweight LLM).
- **Caching**: Model weights (~1 GB) are cached permanently in browser CacheStorage/IndexedDB upon first load.
- **Troubleshooting**: If WebGPU is unsupported or disabled, the engine falls back seamlessly to deterministic rule-based translation (`src/lang/agent/micro-brain.ts`).

### Tier 2: Local AI Model Server (Self-Hosted)
Developers can point their browser or CLI to a local LLM server without cloud dependencies:
- **Ollama**:
  ```bash
  ollama run qwen2.5-coder:1.5b
  ```
  Set in `.env`:
  ```bash
  VITE_SDEV_AGENT_LOCAL_URL=http://localhost:11434/v1
  VITE_SDEV_AGENT_LOCAL_MODEL=qwen2.5-coder:1.5b
  ```
- **LM Studio**:
  Start local server on port `1234` and configure `http://localhost:1234/v1`.

### Tier 3: Hosted Edge Gateway
When a file explicitly specifies `!#agent:online` or cloud mode is selected:
- The app sends inference requests to the Supabase Edge Function `/sdev-agent`.
- Configure `SDEV_AI_API_KEY` and `SDEV_AI_BASE_URL` (plus optional `SDEV_AI_MODEL`, `SDEV_AI_MODEL_FAST`, `SDEV_AI_MODEL_STRONG`) in Supabase project secrets.

---

## 4. Hardware & Microcontroller Operations

### Web Serial & WebUSB API Flashing
- The Web IDE connects directly to 30 supported boards (Arduino Uno R3/R4, Mega, Leonardo, Micro, MKR, Zero, Due, Giga, Portenta, ESP32/C3/S2/S3, ESP8266, Raspberry Pi Pico/W, ATtiny85, Teensy 4.1) via browser Web Serial, WebUSB (DFU), and File System Access API (UF2).
- **Requirements**: Chromium-based browsers (Chrome, Edge, Opera) over HTTPS or `localhost`.
- **Baud Rate**: Default is `115200` baud.

### Cloud Compilation (`compile-firmware`)
- When local tools are unavailable, the IDE dispatches C++ firmware code to the Supabase `compile-firmware` Edge Function (or a custom local `tools/arduino-build-server/server.mjs` at `VITE_ARDUINO_BUILD_URL`).
- Verified boards compile via Wokwi Hexi or `arduino-cli compile --fqbn <board_fqbn>` and return `.hex`/`.bin` payloads for direct browser flashing.

---

## 5. Incident Response & Troubleshooting

### Incident: WebGPU Out of Memory / Context Lost
- **Symptom**: Console logs `WebGPU device lost` or model loading hangs.
- **Remediation**:
  1. Restart browser or clear browser tab GPU cache.
  2. The IDE automatically switches to `micro-brain` deterministic parser.
  3. Ensure user GPU has at least 2 GB of VRAM.

### Incident: Disk Space Depletion During CI/Build (`ENOSPC`)
- **Symptom**: Node / Vite builds fail with `ENOSPC: no space left on device`.
- **Remediation**:
  ```bash
  # Clear npm cache
  npm cache clean --force
  # Purge build outputs
  rm -rf dist electron-release node_modules/.vite
  ```

### Incident: Edge Function 504 Gateway Timeout
- **Symptom**: SDEV agent requests fail with HTTP 504.
- **Remediation**:
  1. Verify the upstream OpenAI-compatible provider status.
  2. Reduce `max_tokens` or increase function timeout in `supabase/functions/sdev-agent/config.toml`.
  3. Verify that `brain-prompt.ts` and `supabase/functions/sdev-agent/index.ts` system prompts are synchronized.

### Incident: Rollback Release
If a breaking regression is shipped in a published release:
1. Revert `release.json` to previous stable version tag.
2. Re-run `node scripts/release.mjs`.
3. Redeploy static hosting with updated `public/releases.json`.
