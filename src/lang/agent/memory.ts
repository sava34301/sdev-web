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
  /** whole-file results: hash of the file -> canonical source */
  results?: Record<string, { source: string; at: number }>;
  /** understander version that wrote the saved lines/results */
  agent?: string;
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
    results: m.results ?? {},
    agent: m.agent,
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

/** Stable short hash of a file plus everything that changes how it is read. */
export function understandKey(source: string, extra = ''): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  const s = source + '\u0000' + extra;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822507);
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + s.length.toString(36);
}

const MAX_RESULTS = 100;

export function recallResult(memory: AgentMemory, key: string): string | null {
  return memory.results?.[key]?.source ?? null;
}

export function rememberResult(memory: AgentMemory, key: string, source: string): void {
  const results = (memory.results ??= {});
  results[key] = { source, at: Date.now() };
  const keys = Object.keys(results);
  if (keys.length > MAX_RESULTS) {
    keys.sort((a, b) => results[a].at - results[b].at).slice(0, keys.length - MAX_RESULTS).forEach((k) => delete results[k]);
  }
}
