/**
 * Thin bridge to `brain_instructions` and `brain_input` in `lang/agent/brain.sdev`.
 */
import type { BrainRequest } from './brain';
import { sdevBrainInstructions, sdevBrainInput } from './sdev-engine';

export function brainInstructions(format?: 'canonical' | 'ai'): string {
  return sdevBrainInstructions(format) ?? '';
}

export function brainInput(req: BrainRequest): string {
  return sdevBrainInput(req) ?? req.source;
}
