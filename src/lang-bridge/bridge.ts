/**
 * SDEV language bridge.
 *
 * The bridge is the ONLY TypeScript file in the language execution path.
 * It routes source code to either:
 *   - the new v2 runtime (pure JavaScript, see lang/runtime/v2.js), or
 *   - the legacy v1 TypeScript runtime (src/lang/*), used as the refine-mode
 *     fallback so every existing .sdev file keeps working.
 *
 * Selection rules:
 *   - If the source starts with `#!sdev v1`, use the v1 runtime.
 *   - If the source starts with `#!sdev v2`, use the v2 runtime.
 *   - Otherwise, use whichever runtime is configured via
 *     `localStorage.sdev_runtime` ("v1" | "v2"). Default: "v1" until v2 is
 *     feature-complete for the launch smoke tests.
 *
 * The long-term plan (see .lovable/plan.md) is to replace lang/runtime/v2.js
 * with a self-hosted WASM module compiled from .sdev sources. This bridge
 * will then load that .wasm binary and expose the same `execute()` surface.
 */
// Plain JS module, no .d.ts — declared ambiently below.
import { run as runV2, VERSION as V2_VERSION } from '../../lang/runtime/v2.js';
import { execute as executeV1 } from '@/lang';
import type { ExecuteOptions, ExecutionResult } from '@/lang';

export type RuntimeChoice = 'v1' | 'v2' | 'auto';

const RUNTIME_KEY = 'sdev_runtime';

export function getRuntimeChoice(): RuntimeChoice {
  if (typeof localStorage === 'undefined') return 'auto';
  const v = localStorage.getItem(RUNTIME_KEY);
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
  // Default: v1 stays authoritative until every v1 example passes on v2.
  return 'v1';
}

export function execute(source: string, options: ExecuteOptions = {}): ExecutionResult {
  const runtime = pickRuntime(source);
  if (runtime === 'v2') {
    const out: string[] = [];
    const result = runV2(source, { onOutput: (line: string) => out.push(line) });
    return {
      success: result.success,
      output: result.output.length ? result.output : out,
      error: result.error ?? undefined,
      detectedLanguage: null,
    };
  }
  return executeV1(source, options);
}

export const SDEV_V2_VERSION: string = V2_VERSION;

export * from '@/lang';
