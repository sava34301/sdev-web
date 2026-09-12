/**
 * Agent memory — what the agent has learned from the programs this user
 * already ran. It is plain JSON so it can live in localStorage (browser),
 * ~/.sdev/agent-memory.json (CLI) or be shipped into a dialect.
 */
import type { Intent } from './vocabulary';

export interface AgentMemory {
  version: 1;
  /** user word -> canonical intent, with how often it was seen */
  words: Record<string, { intent: Intent; hits: number }>;
  /** variable names the user tends to use */
  names: Record<string, number>;
  /** whole-line rewrites the AI brain produced, reusable offline */
  lines: Record<string, { canonical: string; hits: number }>;
  /** files the agent has learned from */
  programs: number;
  updated: number;
}

export function emptyMemory(): AgentMemory {
  return { version: 1, words: {}, names: {}, lines: {}, programs: 0, updated: 0 };
}

export interface MemoryStore {
  load(): AgentMemory;
  save(memory: AgentMemory): void;
}

const KEY = 'sdev_agent_memory';

function sane(value: unknown): AgentMemory {
  const m = value as Partial<AgentMemory> | null;
  if (!m || typeof m !== 'object') return emptyMemory();
  return {
    version: 1,
    words: m.words ?? {},
    names: m.names ?? {},
    lines: m.lines ?? {},
    programs: m.programs ?? 0,
    updated: m.updated ?? 0,
  };
}

/** Browser-side store; a no-op when there is no localStorage. */
export const browserStore: MemoryStore = {
  load() {
    try {
      if (typeof localStorage === 'undefined') return emptyMemory();
      const raw = localStorage.getItem(KEY);
      return raw ? sane(JSON.parse(raw)) : emptyMemory();
    } catch {
      return emptyMemory();
    }
  },
  save(memory) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(KEY, JSON.stringify(memory));
    } catch {
      /* quota or private mode — learning is best-effort */
    }
  },
};

let active: MemoryStore = browserStore;

export function setMemoryStore(store: MemoryStore): void {
  active = store;
}

export function loadMemory(): AgentMemory {
  return active.load();
}

export function saveMemory(memory: AgentMemory): void {
  memory.updated = Date.now();
  active.save(memory);
}

const MAX_LINES = 500;

export function rememberWord(memory: AgentMemory, word: string, intent: Intent): void {
  const key = word.toLowerCase();
  const prev = memory.words[key];
  memory.words[key] = { intent, hits: (prev?.intent === intent ? prev.hits : 0) + 1 };
}

export function rememberName(memory: AgentMemory, name: string): void {
  memory.names[name] = (memory.names[name] ?? 0) + 1;
}

export function rememberLine(memory: AgentMemory, original: string, canonical: string): void {
  const key = original.trim();
  if (!key || key === canonical.trim()) return;
  const prev = memory.lines[key];
  memory.lines[key] = { canonical, hits: (prev?.hits ?? 0) + 1 };
  const keys = Object.keys(memory.lines);
  if (keys.length > MAX_LINES) {
    keys
      .sort((a, b) => memory.lines[a].hits - memory.lines[b].hits)
      .slice(0, keys.length - MAX_LINES)
      .forEach((k) => delete memory.lines[k]);
  }
}

/** Learn the shape of a program the user ran successfully. */
export function learnFromProgram(memory: AgentMemory, canonical: string): void {
  memory.programs += 1;
  const re = /^\s*set\s+([\p{L}\p{N}_]+)\s+to\b/gmu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(canonical))) rememberName(memory, m[1]);
  const fn = /^\s*to\s+([\p{L}\p{N}_]+)\b/gmu;
  while ((m = fn.exec(canonical))) rememberName(memory, m[1]);
}

export function memoryWordMap(memory: AgentMemory): Map<string, Intent> {
  const map = new Map<string, Intent>();
  for (const [word, entry] of Object.entries(memory.words)) {
    if (entry.hits > 0) map.set(word, entry.intent);
  }
  return map;
}
