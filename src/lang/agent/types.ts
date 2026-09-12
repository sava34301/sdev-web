/** Shared types for the understanding agent. */
import type { AgentMode, BrainMode } from './directives';
import type { Intent } from './vocabulary';
/** Anything that carries dialect words — the full spec, or the lexer's view. */
export interface DialectWords {
  names?: Record<string, string>;
  synonyms?: Record<string, string[]>;
}

export interface AgentNote {
  line: number;
  from: string;
  to: string;
  why: string;
  source: 'rules' | 'memory' | 'brain';
}

export interface UnderstandOptions {
  /** default mode when the file carries no directive */
  mode?: AgentMode;
  /** where the brain runs */
  brain?: BrainMode;
  /** learn from this file */
  learn?: boolean;
  /** the dialect the file is written in, if any */
  dialect?: DialectWords | null;
  /** endpoint for the local brain (defaults to SDEV_AGENT_LOCAL_URL) */
  localUrl?: string;
  /** print what the agent changed */
  verbose?: boolean;
}

export interface UnderstandResult {
  /** canonical sdev, ready for the lexer / compiler */
  source: string;
  /** true when the agent rewrote anything */
  changed: boolean;
  /** the mode that actually applied */
  mode: AgentMode;
  notes: AgentNote[];
  /** user words the agent resolved, ready to promote into a dialect */
  learned: Record<string, Intent>;
  /** lines the agent could not make sense of */
  unresolved: number[];
  /** which brain answered, if any */
  brainUsed: 'none' | 'local' | 'online';
}
