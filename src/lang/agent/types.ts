/** Shared types for the understanding agent. */
import type { Intent } from './vocabulary';

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

export interface BrainRequest {
  source: string;
  draft: string;
  unresolved: number[];
  vocabulary: Record<string, string>;
  problems?: string[];
  format?: 'canonical' | 'ai';
}

export interface BrainReply {
  canonical: string;
  words?: Record<string, string>;
  notes?: string;
}

export interface FixResult {
  fixed_code: string;
  explanation: string;
  changes: string;
  how_it_works: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface NormalizedEndpoints {
  baseUrl: string;
  chatUrl: string;
  modelsUrl: string;
  tagsUrl: string;
  isOllamaNative: boolean;
}

export interface BrainSettings {
  localUrl: string;
  localModel: string;
  browser: boolean;
  customLocal: boolean;
  allowOnline: boolean;
}

export interface LocalProbeResult {
  ok: boolean;
  models: string[];
  activeModel?: string;
  baseUrl: string;
  chatUrl: string;
  serverType?: 'LM Studio' | 'Ollama' | 'llama.cpp' | 'LocalAI' | 'OpenAI-Compatible';
  error?: string;
  isCors?: boolean;
  hint?: string;
}

export interface BrainOutcome {
  reply: BrainReply | null;
  used: 'none' | 'local' | 'online';
}

export type IntentCategory =
  | 'PRINT' | 'LET' | 'ASSIGN' | 'FUNC_DEF' | 'RETURN'
  | 'IF' | 'ELIF' | 'ELSE' | 'WHILE' | 'FOR_EACH' | 'FOR_RANGE'
  | 'CLASS_DEF' | 'LIST_MAP' | 'LIST_FILTER' | 'COMMENT' | 'BLOCK_END';

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
  source: 'rules' | 'memory' | 'brain' | 'sdev';
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
  /** 'auto' (default): the sdev-written engine first, TypeScript fallback; 'ts': fallback only */
  engine?: 'auto' | 'ts';
  /** names defined in other project files, so cross-file references resolve */
  projectNames?: string[];
  /** ignore cached whole-file and line memories for this run and re-understand from scratch */
  fresh?: boolean;
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
  /** true when this came straight from an earlier run of the same file */
  cached?: boolean;
}
