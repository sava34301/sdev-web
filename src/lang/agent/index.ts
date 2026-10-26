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
import { senseFile, parses, unknownNames, parseError } from './sense';
import { think, online } from './brain';
import { sdevUnderstand, isAiDialect, aiToSdev, sdevCloseBlocks } from './sdev-engine';
import {
  loadMemory, saveMemory, memoryWordMap, rememberWord, rememberLine,
  learnFromProgram, type AgentMemory, understandKey, recallResult, rememberResult,
} from './memory';
import type { UnderstandOptions, UnderstandResult } from './types';
import { CANONICAL as CANONICAL_WORDS, type Intent } from './vocabulary';

export * from './types';
export * from './directives';
export * from './memory';
export * from './promote';
export { senseFile, parses, unknownNames, definedNames, builtinNames, wordsNeedReading } from './sense';
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
  // sdev:ai files are translated to canonical sdev before anything else reads them
  const stripped = isAiDialect(source) ? aiToSdev(source) : directives.source;
  const memory = loadMemory();
  // Saved readings from an older understander may be wrong — start them over.
  if (memory.agent !== AGENT_VERSION) {
    memory.lines = {};
    memory.results = {};
    memory.agent = AGENT_VERSION;
    saveMemory(memory);
  }
  return { mode, brain, learn, stripped, memory };
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

/** Bumped whenever the understander changes how it reads files, so saved readings from older versions are never reused. */
export const AGENT_VERSION = 'u6';

/** Which engine produced the last rule rewrite. */
export let lastEngine: 'sdev' | 'ts' = 'ts';
export { sdevUnderstand, isAiDialect, aiToSdev, sdevToAi, sdevDefinedNames, sdevProjectNames, sdevCloseBlocks, sdevCloseAiBraces, sdevCheckBlocks } from './sdev-engine';

/**
 * A file that is a request in plain words ("make a window that is a
 * calculator") is not code to repair — it is a program to write. Rules would
 * only mangle it, so it goes straight to the brain.
 */
export function isRequest(source: string): boolean {
  const rows = source.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));
  if (!rows.length || rows.length > 6) return false;
  if (rows.some((l) => /[=(){}[\]]|::|;;/.test(l) && !/^[\p{L}\s,.'"!?-]+$/u.test(l))) return false;
  const text = rows.join(' ');
  const verb = /^(please\s+)?(make|build|create|write|code|generate|design|program|draw|give\s+me|show\s+me|i\s+want|i\s+need|i'd\s+like|can\s+you|could\s+you|let's|lets)\b/i;
  const thing = /\b(window|app|application|program|game|calculator|form|page|site|website|tool|todo|to-do|list|clock|timer|stopwatch|converter|quiz|interface|gui|ui|button|buttons|menu|counter|chat|editor|notes?|tracker|dashboard|generator|simulator|animation|drawing)\b/i;
  return verb.test(text) && thing.test(text) && text.split(/\s+/).length >= 3;
}

function runRules(prep: Prepared, opts: UnderstandOptions) {
  // A request is a program to write, never a line to look up in memory.
  const request = isRequest(prep.stripped);
  const { source: remembered } = request ? { source: prep.stripped } : applyMemoryLines(prep.stripped, prep.memory);
  if (request) {
    const count = remembered.split('\n').length;
    return {
      done: false as const, forceBrain: true as const, source: remembered,
      sense: senseFile(remembered, new Map()), learned: {} as Record<string, Intent>,
      notes: [{ line: 0, from: '', to: '', why: 'this is a request for a program — the AI writes it', source: 'rules' as const }],
      unresolved: Array.from({ length: count }, (_, i) => i + 1),
    };
  }
  const extraWords = new Map([...dialectWordMap(opts), ...memoryWordMap(prep.memory)]);
  const sense = senseFile(remembered, extraWords);

  if (!sense.suspicious && sense.parses) {
    return { done: true as const, source: remembered, sense, learned: {} as Record<string, Intent>, notes: [], unresolved: [] as number[] };
  }

  // The self-hosted engine (written in sdev) goes first; the TypeScript
  // rules below are its fallback whenever it is not sure of every line.
  if (opts.engine !== 'ts') {
    const known = new Set([...knownNames(prep.memory), ...(opts.projectNames ?? [])]);
    const words: [string, string][] = [...extraWords].map(([w, intent]) => [w, CANONICAL_WORDS[intent] ?? w]);
    const s = sdevUnderstand(remembered, known, words);
    if (s && s.sure && s.source !== remembered && parses(s.source) && unknownNames(s.source).length === 0) {
      lastEngine = 'sdev';
      return { done: true as const, source: s.source, sense, learned: {} as Record<string, Intent>, notes: s.notes, unresolved: [] as number[] };
    }
  }
  lastEngine = 'ts';
  const result = repair(remembered, {
    extraWords,
    knownNames: knownNames(prep.memory),
    strict: prep.mode === 'strict',
  });
  void opts;
  // People rarely write `end`. If their file doesn't hang together without it,
  // close what they left open — but only when that actually helps.
  let source = result.source;
  const closed = sdevCloseBlocks(source) ?? closeBlocks(source);
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

  // Already understood this exact file before? Reuse it — no thinking twice.
  const key = understandKey(source, JSON.stringify([AGENT_VERSION, opts.dialect ?? null, opts.projectNames ?? [], prep.mode, prep.brain]));
  const cached = recallResult(prep.memory, key);
  if (cached !== null) {
    return { source: cached, changed: cached !== prep.stripped, mode: prep.mode, notes: [], learned: {}, unresolved: [], brainUsed: 'none', cached: true };
  }

  const rules = runRules(prep, opts);
  let current = rules.source;
  let brainUsed: 'none' | 'local' | 'online' = 'none';
  const notes = [...rules.notes];

  const needsBrain =
    prep.brain !== 'none' &&
    !rules.done &&
    (prep.mode === 'on' || rules.forceBrain || rules.unresolved.length > 0 || !parses(current) || unknownNames(current).length > 0);

  if (needsBrain) {
    const improved = await askBrain(prep, opts, current, rules.unresolved, [], notes, prep.mode === 'on' || rules.forceBrain || rules.unresolved.length > 0);
    if (improved) { current = improved.source; brainUsed = improved.used; }
  }

  // Only keep answers that hold together, so a bad reading is never frozen in.
  if (parses(current) && (rules.done || brainUsed !== 'none' || unknownNames(current).length === 0)) rememberResult(prep.memory, key, current);
  finish(prep, current, rules.learned);
  lastUnderstood.set(source, current);
  if (lastUnderstood.size > 20) lastUnderstood.delete(lastUnderstood.keys().next().value as string);

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

/** problems a draft still has, in words the brain can act on */
export function problemsOf(source: string): string[] {
  const out: string[] = [];
  const err = parseError(source);
  if (err) out.push(`does not parse: ${err}`);
  const unknown = unknownNames(source);
  if (unknown.length) out.push(`uses names nothing defines: ${unknown.slice(0, 12).join(', ')}`);
  return out;
}

/**
 * Ask the brain, check its answer, and when the answer still has problems
 * tell it what they are and ask once more. Returns null when nothing better
 * than `draft` came back.
 */
async function askBrain(
  prep: Prepared, opts: UnderstandOptions, draft: string, unresolved: number[],
  extraProblems: string[], notes: UnderstandResult['notes'], preferReply = false,
): Promise<{ source: string; used: 'local' | 'online' } | null> {
  const vocabulary: Record<string, string> = {};
  for (const [word, entry] of Object.entries(prep.memory.words)) vocabulary[word] = entry.intent;
  const mode = prep.brain === 'auto' && !online() ? 'local' : prep.brain;
  const score = (src: string) => (parses(src) ? 0 : 100) + unknownNames(src).length;
  let best: { source: string; used: 'local' | 'online' } | null = null;
  let bestScore = score(draft) + (extraProblems.length ? 50 : 0);
  let problems = [...extraProblems, ...problemsOf(draft)];
  // Writing a whole program from a request: let the model use sdev:ai.
  const writing = isRequest(prep.stripped);

  for (let attempt = 0; attempt < 2; attempt++) {
    const { reply, used } = await think(
      { source: prep.stripped, draft: best?.source ?? draft, unresolved, vocabulary, problems, format: writing ? 'ai' : 'canonical' },
      mode, opts.localUrl,
    );
    if (!reply?.canonical || used === 'none') break;
    // Whole programs come back in sdev:ai; turn them into canonical sdev here.
    if (isAiDialect(reply.canonical)) reply.canonical = aiToSdev(reply.canonical);
    const s = score(reply.canonical);
    if (s < bestScore || (s === bestScore && (preferReply || extraProblems.length > 0) && !best)) {
      best = { source: reply.canonical, used };
      bestScore = s;
      for (const [word, intent] of Object.entries(reply.words ?? {})) if (prep.learn) rememberWord(prep.memory, word, intent as Intent);
    }
    if (s === 0) break;
    problems = problemsOf(reply.canonical);
  }
  if (!best) return null;

  const before = draft.split('\n');
  const after = best.source.split('\n');
  const original = prep.stripped.split('\n');
  // A remembered line is only trustworthy when the author's file, the draft
  // and the answer still line up one-to-one.
  const aligned = original.length === before.length && before.length === after.length && !isRequest(prep.stripped);
  after.forEach((line, i) => {
    if (before[i] === undefined || before[i].trim() !== line.trim()) {
      notes.push({ line: i + 1, from: (before[i] ?? '').trim(), to: line.trim(), why: 'understood by the AI', source: 'brain' });
      if (prep.learn && aligned && original[i] !== undefined) rememberLine(prep.memory, original[i], line.trim());
    }
  });
  return best;
}

/**
 * The program was understood but failed when it ran. Tell the brain what the
 * runtime said and get a corrected program back (or null).
 */
export async function reconsider(source: string, error: string, opts: UnderstandOptions = {}): Promise<UnderstandResult | null> {
  const prep = begin(source, opts);
  if (prep.mode === 'off' || prep.brain === 'none') return null;
  const draft = (lastUnderstood.get(source) ?? prep.stripped);
  const notes: UnderstandResult['notes'] = [];
  const improved = await askBrain(prep, opts, draft, [], [`it failed when run: ${error}`], notes, true);
  if (!improved || improved.source.trim() === draft.trim()) return null;
  finish(prep, improved.source, {});
  return { source: improved.source, changed: true, mode: prep.mode, notes, learned: {}, unresolved: [], brainUsed: improved.used };
}

const lastUnderstood = new Map<string, string>();

/** Just strip the directives — used by tooling that must not rewrite code. */
export function stripAgentDirectives(source: string): string {
  return scanDirectives(source).source;
}

/**
 * The file exactly as its author wrote it — directives removed, and an
 * sdev:ai file turned into canonical sdev — with no rules or AI applied.
 * Runners try this first: working code always reaches the compiler untouched.
 */
export function asWritten(source: string): string {
  return isAiDialect(source) ? aiToSdev(source) : scanDirectives(source).source;
}

/** Is the agent switched off for this file? */
export function agentDisabled(source: string): boolean {
  return scanDirectives(source).mode === 'off';
}
