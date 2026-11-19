import { sdevScanDirectives } from './sdev-engine';

export type AgentMode = 'off' | 'auto' | 'on' | 'strict';
export type BrainMode = 'auto' | 'local' | 'online' | 'none';

export interface AgentDirectives {
  mode: AgentMode | null;
  brain: BrainMode | null;
  learn: boolean | null;
}

export interface DirectiveScan extends AgentDirectives {
  /** the source with every directive line removed (line count preserved) */
  source: string;
  found: boolean;
}

export function scanDirectives(source: string): DirectiveScan {
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
