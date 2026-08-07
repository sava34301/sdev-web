/**
 * SDEV language bridge.
 *
 * The bridge is the ONLY TypeScript file in the language execution path.
 * It routes source code to either:
 *   - sdev v2: the SELF-HOSTED toolchain — the compiler is written in sdev
 *     (lang/compiler/lexer.sdev, parser.sdev, codegen.sdev), compiles itself
 *     byte-identically, and its bytecode runs on the hand-written seed VM
 *     (lang/bootstrap/seed.wat). No JavaScript interpreter participates.
 *   - the legacy v1 TypeScript runtime (src/lang/*), kept so every existing
 *     .sdev file keeps working.
 *
 * Selection rules:
 *   - `#!sdev v1` → v1, `#!sdev v2` → v2.
 *   - Otherwise `localStorage.sdev_runtime` ("v1" | "v2"). Default: "v1"
 *     until the self-hosted compiler covers the full v2 surface.
 *
 * Because the self-hosted path must fetch and instantiate the seed VM, v2
 * execution is asynchronous: use `executeAsync`. The synchronous `execute`
 * remains for v1 only.
 */
import { execute as executeV1, executeAsync as executeAnyAsync } from '@/lang';
import type { ExecuteOptions, ExecutionResult } from '@/lang';

export type RuntimeChoice = 'v1' | 'v2' | 'auto';

const RUNTIME_KEY = 'sdev_runtime';

export function getRuntimeChoice(): RuntimeChoice {
  if (typeof localStorage === 'undefined') return 'auto';
  const v = localStorage.getItem(RUNTIME_KEY);
  if (v === 'v2-wasm') return 'v2';
  return v === 'v1' || v === 'v2' ? v : 'auto';
}

export function setRuntimeChoice(choice: RuntimeChoice): void {
  if (typeof localStorage === 'undefined') return;
  if (choice === 'auto') localStorage.removeItem(RUNTIME_KEY);
  else localStorage.setItem(RUNTIME_KEY, choice);
}

function pickRuntime(source: string): 'v1' | 'v2' {
  const firstLine = source.slice(0, 80).split('\n', 1)[0].trim();
  if (firstLine.startsWith('#!sdev v1')) return 'v1';
  if (firstLine.startsWith('#!sdev v2')) return 'v2';
  const choice = getRuntimeChoice();
  if (choice === 'v1' || choice === 'v2') return choice;
  // Default: v1 stays authoritative until the self-hosted compiler is complete.
  return 'v1';
}

/** v1 only. v2 is self-hosted and therefore async — see `executeAsync`. */
export function execute(source: string, options: ExecuteOptions = {}): ExecutionResult {
  if (pickRuntime(source) === 'v2') {
    return {
      success: false,
      output: [],
      error: 'sdev v2 runs only on the self-hosted compiler (async). Use executeAsync().',
      detectedLanguage: null,
    };
  }
  return executeV1(source, options);
}

export function executeAsync(source: string, options: ExecuteOptions = {}): Promise<ExecutionResult> {
  return executeAnyAsync(source, options);
}

/** Version reported by the self-hosted seed VM (`sdev_version()`). */
export const SDEV_V2_VERSION = '2.0-selfhosted';

export * from '@/lang';

