import { sdevScanDirectives } from './sdev-engine';
import type { AgentMode, BrainMode, AgentDirectives, DirectiveScan } from './types';

export type { AgentMode, BrainMode, AgentDirectives, DirectiveScan };

export function scanDirectives(source: string): DirectiveScan {
  if (!source.includes('!#')) {
    return { mode: null, brain: null, learn: null, found: false, source };
  }
  return (
    sdevScanDirectives(source) ?? {
      mode: null,
      brain: null,
      learn: null,
      found: false,
      source,
    }
  );
}
