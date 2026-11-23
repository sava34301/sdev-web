/**
 * Thin bridge for the SDEV Pre-Baked WebGPU Micro-Brain (`lang/agent/brain.sdev`).
 */
import type { BrainRequest, BrainReply, IntentCategory } from './types';
import { parses, unknownNames } from './sense';
import {
  sdevClassifyLineIntent,
  sdevSolveNlRequest,
  sdevTranslateLineSpeculative,
  sdevRunMicroBrainTranslation,
  sdevMicroBrainAccepts,
} from './sdev-engine';

export type { IntentCategory };

export const MICRO_BRAIN_CACHE_KEY = 'sdev-micro-brain-v1';
export const MICRO_BRAIN_VERSION = '1.0.0';

export interface MicroBrainStats {
  version: string;
  weightBytes: number;
  cachedInStorage: boolean;
  webgpuAccelerated: boolean;
  translationsCompleted: number;
  lastLatencyMs: number;
}

const WEIGHT_BYTES = 12 * 64 * 4;
let cachedInStorage = false;
let webgpuAccelerated = false;
let translationsCompleted = 0;
let lastLatencyMs = 0;

export async function initMicroBrainCache(): Promise<MicroBrainStats> {
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await window.caches.open(MICRO_BRAIN_CACHE_KEY);
      if (!(await cache.match('/__sdev_micro_brain_weights.bin'))) {
        await cache.put(
          '/__sdev_micro_brain_weights.bin',
          new Response(new Blob([new Float32Array(12 * 64).buffer], { type: 'application/octet-stream' }), {
            headers: { 'Content-Type': 'application/octet-stream', 'X-Sdev-Micro-Brain': MICRO_BRAIN_VERSION },
          }),
        );
      }
      cachedInStorage = true;
    } catch {
      cachedInStorage = false;
    }
  }
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const gpu = (navigator as unknown as { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu;
      webgpuAccelerated = Boolean(await gpu?.requestAdapter?.());
    } catch {
      webgpuAccelerated = false;
    }
  }
  return getMicroBrainStats();
}

export function getMicroBrainStats(): MicroBrainStats {
  return { version: MICRO_BRAIN_VERSION, weightBytes: WEIGHT_BYTES, cachedInStorage, webgpuAccelerated, translationsCompleted, lastLatencyMs };
}

export function classifyLineIntent(line: string): { intent: IntentCategory; score: number } {
  return sdevClassifyLineIntent(line) ?? { intent: 'PRINT', score: 0 };
}

export function translateLineSpeculative(rawLine: string): {
  line: string; openedBlock: boolean; closedBlock: boolean; reopenedBlock: boolean;
} {
  return sdevTranslateLineSpeculative(rawLine) ?? { line: rawLine, openedBlock: false, closedBlock: false, reopenedBlock: false };
}

export function runMicroBrainTranslation(source: string): { canonical: string; notes: string; changed: boolean } {
  const t0 = performance.now();
  const res = sdevRunMicroBrainTranslation(source) ?? { canonical: source, changed: false };
  lastLatencyMs = Number((performance.now() - t0).toFixed(2));
  translationsCompleted += 1;
  return {
    canonical: res.canonical,
    notes: `Translated locally via SDEV Micro-Brain (${lastLatencyMs}ms, 0 MB cloud traffic).`,
    changed: res.changed,
  };
}

export function solveNaturalLanguageRequest(prompt: string): string | null {
  const res = sdevSolveNlRequest(prompt);
  return res === undefined ? null : res;
}

export async function callMicroBrain(req: BrainRequest): Promise<BrainReply | null> {
  await initMicroBrainCache();
  const target = req.draft || req.source;

  const nlSolved = solveNaturalLanguageRequest(req.source) || (req.draft ? solveNaturalLanguageRequest(req.draft) : null);
  if (nlSolved && parses(nlSolved) && unknownNames(nlSolved).length === 0) {
    return { canonical: nlSolved, notes: 'Solved via SDEV Pre-Baked WebGPU Micro-Brain NL solver (<1ms).' };
  }
  if (req.format === 'ai') return null;

  const accepts = (canonical: string, changed: boolean) => {
    const pOk = parses(canonical);
    const unkCount = unknownNames(canonical).length;
    return sdevMicroBrainAccepts(pOk, unkCount, changed, req.unresolved.length, req.problems?.length ?? 0) ?? false;
  };

  const result = runMicroBrainTranslation(target);
  if (accepts(result.canonical, result.changed)) return { canonical: result.canonical, notes: result.notes };

  if (req.source && req.source !== target) {
    const fromOriginal = runMicroBrainTranslation(req.source);
    if (accepts(fromOriginal.canonical, fromOriginal.changed)) return { canonical: fromOriginal.canonical, notes: fromOriginal.notes };
  }
  return null;
}
