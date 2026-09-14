/**
 * The understanding agent.
 *
 * Sits in front of the lexer, the parser and the code generator on EVERY
 * entry point (web IDE, CLI, WASM bridge). It reads the whole file, works out
 * what the author meant and hands canonical sdev to the untouched compiler.
 *
 *   user source -> [directives] -> [rules + memory] -> [AI brain] -> canonical sdev
 *
 * Turn it off per file with `!#agent:off`, choose where the AI runs with
 * `!#agent:local` / `!#agent:online`.
 */
import { scanDirectives, type AgentMode, type BrainMode } from './directives';
import { repair, closeBlocks } from './repair';
import { senseFile, parses } from './sense';
import { think, online } from './brain';
import {
  loadMemory, saveMemory, memoryWordMap, rememberWord, rememberLine,
  learnFromProgram, type AgentMemory,
} from './memory';
import type { UnderstandOptions, UnderstandResult } from './types';
import { CANONICAL as CANONICAL_WORDS, type Intent } from './vocabulary';

export * from './types';
export * from './directives';
export * from './memory';
export * from './promote';
export { senseFile, parses } from './sense';
export { repair } from './repair';
export { VOCABULARY, CANONICAL } from './vocabulary';
export type { Intent } from './vocabulary';

function knownNames(memory: AgentMemory): Set<string> {
  return new Set(Object.keys(memory.names));
}

function applyMemoryLines(source: string, memory: AgentMemory): { source: string; hit: boolean } {
  let hit = false;
  const out = source.split('\n').map((line) => {
    const entry = memory.lines[line.trim()];
    if (!entry) return line;
    hit = true;
    const indent = line.match(/^\s*/)?.[0] ?? '';
    return indent + entry.canonical;
  });
  return { source: out.join('\n'), hit };
}

interface Prepared {
  mode: AgentMode;
  brain: BrainMode;
  learn: boolean;
  stripped: string;
  memory: AgentMemory;
}

function begin(source: string, opts: UnderstandOptions): Prepared {
  const directives = scanDirectives(source);
  const mode: AgentMode = directives.mode ?? opts.mode ?? 'auto';
  const brain: BrainMode = directives.brain ?? opts.brain ?? 'auto';
  const learn = directives.learn ?? opts.learn ?? true;
  return { mode, brain, learn, stripped: directives.source, memory: loadMemory() };
}

function skip(source: string, mode: AgentMode): UnderstandResult {
  return { source, changed: false, mode, notes: [], learned: {}, unresolved: [], brainUsed: 'none' };
}

/** A dialect's own words are things the agent must also understand. */
function dialectWordMap(opts: UnderstandOptions): Map<string, Intent> {
  const map = new Map<string, Intent>();
  const canonicalToIntent = new Map<string, Intent>();
  for (const [intent, word] of Object.entries(CANONICAL_WORDS) as [Intent, string][]) {
    canonicalToIntent.set(word, intent);
  }
  const names = opts.dialect?.names ?? {};
  const synonyms = opts.dialect?.synonyms ?? {};
  for (const [canonical, word] of Object.entries(names)) {
    const intent = canonicalToIntent.get(canonical);
    if (intent && word) map.set(word.toLowerCase(), intent);
  }
  for (const [canonical, list] of Object.entries(synonyms)) {
    const intent = canonicalToIntent.get(canonical);
    if (!intent) continue;
    for (const word of list ?? []) map.set(word.toLowerCase(), intent);
  }
  return map;
}

function runRules(prep: Prepared, opts: UnderstandOptions) {
  const { source: remembered } = applyMemoryLines(prep.stripped, prep.memory);
  const extraWords = new Map([...dialectWordMap(opts), ...memoryWordMap(prep.memory)]);
  const sense = senseFile(remembered, extraWords);

  if (!sense.suspicious && sense.parses) {
    return { done: true as const, source: remembered, sense, learned: {} as Record<string, Intent>, notes: [], unresolved: [] as number[] };
  }

  const result = repair(remembered, {
    extraWords,
    knownNames: knownNames(prep.memory),
    strict: prep.mode === 'strict',
  });
  void opts;
  // People rarely write `end`. If their file doesn't hang together without it,
  // close what they left open — but only when that actually helps.
  let source = result.source;
  const closed = closeBlocks(source);
  if (closed !== source && parses(closed)) source = closed;
  // Never make a working program worse: if the file as written holds together
  // and the agent's reading does not, the author's version wins.
  if (source !== remembered && sense.parses && !parses(source)) {
    // Keep the author's file, but say so and still let the brain have a go —
    // a file that compiles can still mean the wrong thing.
    return {
      done: false as const,
      forceBrain: true as const,
      source: remembered,
      sense,
      learned: {} as Record<string, Intent>,
      notes: [...result.notes, { line: 0, from: '', to: '', why: 'the rule rewrite did not compile — your file was kept as written', source: 'rules' as const }],
      unresolved: result.unresolved,
    };
  }
  return { done: false as const, forceBrain: false as const, source, sense, learned: result.learned, notes: result.notes, unresolved: result.unresolved };
}

function finish(prep: Prepared, source: string, learned: Record<string, Intent>): void {
  if (!prep.learn) return;
  for (const [word, intent] of Object.entries(learned)) rememberWord(prep.memory, word, intent);
  learnFromProgram(prep.memory, source);
  saveMemory(prep.memory);
}

/** Synchronous understanding: directives + rules + memory. No network. */
export function understand(source: string, opts: UnderstandOptions = {}): UnderstandResult {
  const prep = begin(source, opts);
  if (prep.mode === 'off') return skip(prep.stripped, 'off');

  const rules = runRules(prep, opts);
  finish(prep, rules.source, rules.learned);

  return {
    source: rules.source,
    changed: rules.source !== prep.stripped,
    mode: prep.mode,
    notes: rules.notes,
    learned: rules.learned,
    unresolved: rules.unresolved,
    brainUsed: 'none',
  };
}

/**
 * Full understanding: rules first, then the AI brain for whatever is left.
 * The brain is only consulted when the rule output still does not parse, or
 * the file is explicitly in `on` mode.
 */
export async function understandAsync(source: string, opts: UnderstandOptions = {}): Promise<UnderstandResult> {
  const prep = begin(source, opts);
  if (prep.mode === 'off') return skip(prep.stripped, 'off');

  const rules = runRules(prep, opts);
  let current = rules.source;
  let brainUsed: 'none' | 'local' | 'online' = 'none';
  const notes = [...rules.notes];

  const needsBrain =
    prep.brain !== 'none' &&
    !rules.done &&
    (prep.mode === 'on' || rules.forceBrain || rules.unresolved.length > 0 || !parses(current));

  if (needsBrain) {
    const vocabulary: Record<string, string> = {};
    for (const [word, entry] of Object.entries(prep.memory.words)) vocabulary[word] = entry.intent;

    const { reply, used } = await think(
      { source: prep.stripped, draft: current, unresolved: rules.unresolved, vocabulary },
      prep.brain === 'auto' && !online() ? 'local' : prep.brain,
      opts.localUrl,
    );

    if (reply?.canonical && parses(reply.canonical)) {
      const before = current.split('\n');
      const after = reply.canonical.split('\n');
      const original = prep.stripped.split('\n');
      // A remembered line is only trustworthy when the author's file, the
      // draft and the answer still line up one-to-one; the rule pass can
      // split a line in two, and then line i is a different statement.
      const aligned = original.length === before.length && before.length === after.length;
      after.forEach((line, i) => {
        if (before[i] !== undefined && before[i].trim() !== line.trim()) {
          notes.push({ line: i + 1, from: before[i].trim(), to: line.trim(), why: 'understood by the AI', source: 'brain' });
          if (prep.learn && aligned) rememberLine(prep.memory, original[i], line.trim());
        }
      });
      current = reply.canonical;
      brainUsed = used;
      for (const [word, intent] of Object.entries(reply.words ?? {})) {
        if (prep.learn) rememberWord(prep.memory, word, intent as Intent);
      }
    }
  }

  finish(prep, current, rules.learned);

  return {
    source: current,
    changed: current !== prep.stripped,
    mode: prep.mode,
    notes,
    learned: rules.learned,
    unresolved: brainUsed === 'none' ? rules.unresolved : [],
    brainUsed,
  };
}

/** Just strip the directives — used by tooling that must not rewrite code. */
export function stripAgentDirectives(source: string): string {
  return scanDirectives(source).source;
}

/** Is the agent switched off for this file? */
export function agentDisabled(source: string): boolean {
  return scanDirectives(source).mode === 'off';
}
