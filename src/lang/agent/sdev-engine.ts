/**
 * Bridge to the self-hosted understander (lang/agent/understander.sdev),
 * the AI dialect (lang/agent/ai-dialect.sdev), and the self-hosted SDEV
 * parser, syntax validator & tree-walking interpreter (lang/agent/parser_eval.sdev).
 *
 * The sdev engine runs first. It answers only when it is sure of every line;
 * otherwise (or when it fails to load or throws) it returns null and the
 * TypeScript understander handles the file as before.
 */
import UNDERSTANDER from '../../../lang/agent/understander.sdev?raw';
import AI_DIALECT from '../../../lang/agent/ai-dialect.sdev?raw';
import PROJECT from '../../../lang/agent/project.sdev?raw';
import BLOCKS from '../../../lang/agent/blocks.sdev?raw';
import PARSER_EVAL from '../../../lang/agent/parser_eval.sdev?raw';
import BRAIN from '../../../lang/agent/brain.sdev?raw';
import MATH from '../../../lang/agent/math.sdev?raw';
import TASKS from '../../../lang/agent/tasks.sdev?raw';
import MEMORY from '../../../lang/agent/memory.sdev?raw';
import { Lexer } from '../core/lexer';
import { Parser } from '../core/parser';
import { Interpreter } from '../runtime/interpreter';
import type {
  AgentNote,
  AgentMode,
  BrainMode,
  BrainRequest,
  FixResult,
  IntentCategory,
} from './types';

type Callable = { call: (args: unknown[], line: number) => unknown };
type Engine = {
  understand: Callable;
  toSdev: Callable;
  toAi: Callable;
  names: Callable;
  close: Callable;
  closeAi: Callable;
  check: Callable;
  parse: Callable;
  validate: Callable;
  eval: Callable;
  scanDirectives: Callable;
  isRequest: Callable;
  normalizeLocalEndpoints: Callable;
  sanitizeBrainOutput: Callable;
  parseBrainReply: Callable;
  solveNlRequest: Callable;
  translateLineSpeculative: Callable;
  runMicroBrainTranslation: Callable;
  microBrainAccepts: Callable;
  brainCandidateScore: Callable;
  brainNeedsOnlineFallback: Callable;
  reconsiderBrainMode: Callable;
  mathRequest: Callable;
  taskRequest: Callable;
  memoryUnderstandKey: Callable;
  memoryApplyLines: Callable;
  memoryLearnNames: Callable;
  promoteWords: Callable;
  boardsUnmask: Callable;
  brainInstructions: Callable;
  brainInput: Callable;
  doctorSystemPrompt: Callable;
  doctorUserPrompt: Callable;
  parseDoctorFix: Callable;
  probeServerType: Callable;
  probeCorsHint: Callable;
  classifyLineIntent: Callable;
};

let engine: Engine | null | false = null;
export let engineError: string | null = null;

function load(): Engine | false {
  if (engine !== null) return engine;
  try {
    const src = BLOCKS + '\n' + UNDERSTANDER + '\n' + AI_DIALECT + '\n' + PROJECT + '\n' + PARSER_EVAL + '\n' + BRAIN + '\n' + MATH + '\n' + TASKS + '\n' + MEMORY;
    const ast = new Parser(new Lexer(src, { translate: false }).tokenize()).parse();
    const interp = new Interpreter(() => {}, { bindWeb: false });
    interp.interpret(ast);
    const env = interp.getGlobalEnv();
    engine = {
      understand: env.get('understand_source', 0) as Callable,
      toSdev: env.get('ai_to_sdev', 0) as Callable,
      toAi: env.get('sdev_to_ai', 0) as Callable,
      names: env.get('defined_names', 0) as Callable,
      close: env.get('close_blocks', 0) as Callable,
      closeAi: env.get('close_ai_braces', 0) as Callable,
      check: env.get('check_blocks', 0) as Callable,
      parse: env.get('sdev_parse_program', 0) as Callable,
      validate: env.get('sdev_validate_syntax', 0) as Callable,
      eval: env.get('sdev_eval_program', 0) as Callable,
      scanDirectives: env.get('scan_directives', 0) as Callable,
      isRequest: env.get('is_request', 0) as Callable,
      normalizeLocalEndpoints: env.get('normalize_local_endpoints', 0) as Callable,
      sanitizeBrainOutput: env.get('sanitize_brain_output', 0) as Callable,
      parseBrainReply: env.get('parse_brain_reply', 0) as Callable,
      solveNlRequest: env.get('solve_nl_request', 0) as Callable,
      translateLineSpeculative: env.get('translate_line_speculative', 0) as Callable,
      runMicroBrainTranslation: env.get('run_micro_brain_translation', 0) as Callable,
      microBrainAccepts: env.get('micro_brain_accepts', 0) as Callable,
      brainCandidateScore: env.get('brain_candidate_score', 0) as Callable,
      brainNeedsOnlineFallback: env.get('brain_needs_online_fallback', 0) as Callable,
      reconsiderBrainMode: env.get('reconsider_brain_mode', 0) as Callable,
      mathRequest: env.get('math_request', 0) as Callable,
      taskRequest: env.get('task_request', 0) as Callable,
      memoryUnderstandKey: env.get('memory_understand_key', 0) as Callable,
      memoryApplyLines: env.get('memory_apply_lines', 0) as Callable,
      memoryLearnNames: env.get('memory_learn_names', 0) as Callable,
      promoteWords: env.get('memory_promote_words', 0) as Callable,
      boardsUnmask: env.get('boards_unmask', 0) as Callable,
      brainInstructions: env.get('brain_instructions', 0) as Callable,
      brainInput: env.get('brain_input', 0) as Callable,
      doctorSystemPrompt: env.get('doctor_system_prompt', 0) as Callable,
      doctorUserPrompt: env.get('doctor_user_prompt', 0) as Callable,
      parseDoctorFix: env.get('parse_doctor_fix', 0) as Callable,
      probeServerType: env.get('probe_server_type', 0) as Callable,
      probeCorsHint: env.get('probe_cors_hint', 0) as Callable,
      classifyLineIntent: env.get('classify_line_intent', 0) as Callable,
    };
  } catch (e) {
    engineError = e instanceof Error ? e.message : String(e);
    engine = false;
  }
  return engine;
}

export interface SdevEngineResult {
  source: string;
  sure: boolean;
  notes: AgentNote[];
}

export interface SdevParseResult {
  ok: boolean;
  ast: unknown[];
  errors: [number, string][];
}

/**
 * Ask the sdev-written understander. null = not available / it failed.
 * `words` are dialect or remembered words as [word, canonical word].
 */
export function sdevUnderstand(source: string, known: Iterable<string>, words: [string, string][] = []): SdevEngineResult | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.understand.call([source, [...known], words], 0) as [string, boolean, [number, string, string][]];
    if (!Array.isArray(r) || typeof r[0] !== 'string') return null;
    return {
      source: r[0],
      sure: r[1] === true,
      notes: (r[2] ?? []).map(([line, from, to]) => ({ line, from, to, why: 'understood by the sdev engine', source: 'sdev' as const })),
    };
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

/** Does this file use the AI dialect (`!#ai` on its first code line)? */
export function isAiDialect(source: string): boolean {
  for (const line of source.split('\n', 20)) {
    const t = line.trim();
    if (!t || t.startsWith('//')) continue;
    return /^!#ai\b/.test(t);
  }
  return false;
}

/** sdev:ai -> canonical sdev. Returns the input unchanged if the engine is unavailable. */
export function aiToSdev(source: string): string {
  const e = load();
  if (!e) return source;
  return String(e.toSdev.call([source], 0));
}

/** canonical sdev -> sdev:ai (starts with `!#ai`). */
export function sdevToAi(source: string): string {
  const e = load();
  if (!e) return source;
  return String(e.toAi.call([source], 0));
}

const namesCache = new Map<string, string[]>();
/**
 * Names one file defines, read by lang/agent/project.sdev. Cached per file
 * content, so a large project only re-reads the files that changed.
 * null = the sdev engine is unavailable (callers use the TypeScript index).
 */
export function sdevDefinedNames(source: string): string[] | null {
  const hit = namesCache.get(source);
  if (hit) return hit;
  const e = load();
  if (!e) return null;
  try {
    const r = e.names.call([source], 0);
    if (!Array.isArray(r)) return null;
    const names = r.map(String);
    if (namesCache.size > 500) namesCache.clear();
    namesCache.set(source, names);
    return names;
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

/** Every name defined across the given files, without repeats. */
export function sdevProjectNames(sources: string[], fallback: (s: string) => Iterable<string>): string[] {
  const out = new Set<string>();
  for (const s of sources) for (const n of sdevDefinedNames(s) ?? fallback(s)) out.add(n);
  return [...out];
}

/** Close blocks the author left open (sdev-written rules). null = engine unavailable. */
export function sdevCloseBlocks(source: string): string | null {
  const e = load();
  if (!e) return null;
  try { return String(e.close.call([source], 0)); } catch (err) { engineError = String(err); return null; }
}

/** Add `}` an sdev:ai file forgot. Returns the input unchanged if the engine is unavailable. */
export function sdevCloseAiBraces(source: string): string {
  const e = load();
  if (!e) return source;
  try { return String(e.closeAi.call([source], 0)); } catch (err) { engineError = err instanceof Error ? err.message : String(err); return source; }
}

/** Blocks that never close or close twice: [line, message]. */
export function sdevCheckBlocks(source: string): [number, string][] {
  const e = load();
  if (!e) return [];
  try {
    const r = e.check.call([source], 0);
    return Array.isArray(r) ? (r as [number, string][]).map(([l, m]) => [Number(l), String(m)]) : [];
  } catch (err) { engineError = err instanceof Error ? err.message : String(err); return []; }
}

/**
 * Self-hosted canonical SDEV parser (lang/agent/parser_eval.sdev).
 * Returns { ok, ast, errors } where each error is [line, message].
 */
export function sdevParseProgram(source: string): SdevParseResult | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.parse.call([source], 0) as [boolean, unknown[], [number, string][]];
    if (!Array.isArray(r)) return null;
    return {
      ok: r[0] === true,
      ast: Array.isArray(r[1]) ? r[1] : [],
      errors: Array.isArray(r[2]) ? r[2].map(([l, m]) => [Number(l), String(m)]) : [],
    };
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

/**
 * Self-hosted SDEV syntax validator (lang/agent/parser_eval.sdev).
 * Returns { valid, errors } where each diagnostic is [line, message].
 */
export function sdevValidateSyntax(source: string): { valid: boolean; errors: [number, string][] } | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.validate.call([source], 0) as [boolean, [number, string][]];
    if (!Array.isArray(r)) return null;
    return {
      valid: r[0] === true,
      errors: Array.isArray(r[1]) ? r[1].map(([l, m]) => [Number(l), String(m)]) : [],
    };
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

/**
 * Self-hosted SDEV tree-walking interpreter (lang/agent/parser_eval.sdev).
 * Executes canonical SDEV programs and returns { ok, output, error }.
 */
export function sdevEvalProgram(source: string, inputs: string[] = []): { ok: boolean; output: string[]; error: string | null } | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.eval.call([source, inputs], 0) as [boolean, unknown[], unknown];
    if (!Array.isArray(r)) return null;
    return {
      ok: r[0] === true,
      output: Array.isArray(r[1]) ? r[1].map(String) : [],
      error: r[2] != null && r[2] !== '' ? String(r[2]) : null,
    };
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

export function sdevScanDirectives(source: string): {
  mode: AgentMode | null;
  brain: BrainMode | null;
  learn: boolean | null;
  found: boolean;
  source: string;
} | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.scanDirectives.call([source], 0) as [string, string, boolean | null, boolean, string];
    if (!Array.isArray(r) || r.length < 5) return null;
    return {
      mode: (r[0] || null) as AgentMode | null,
      brain: (r[1] || null) as BrainMode | null,
      learn: typeof r[2] === 'boolean' ? r[2] : null,
      found: r[3] === true,
      source: String(r[4] ?? source),
    };
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

export function sdevIsRequest(source: string): boolean | null {
  const e = load();
  if (!e) return null;
  try {
    return e.isRequest.call([source], 0) === true;
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

export function sdevNormalizeLocalEndpoints(rawInput = ''): {
  baseUrl: string;
  chatUrl: string;
  modelsUrl: string;
  tagsUrl: string;
  isOllamaNative: boolean;
} | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.normalizeLocalEndpoints.call([rawInput], 0) as [string, string, string, string, boolean];
    if (!Array.isArray(r) || r.length < 5) return null;
    return {
      baseUrl: String(r[0]),
      chatUrl: String(r[1]),
      modelsUrl: String(r[2]),
      tagsUrl: String(r[3]),
      isOllamaNative: r[4] === true,
    };
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

export function sdevSanitizeBrainOutput(code: string, format?: 'canonical' | 'ai'): string | null {
  const e = load();
  if (!e) return null;
  try {
    return String(e.sanitizeBrainOutput.call([code, format ?? 'canonical'], 0) ?? '');
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

export function sdevParseBrainReply(
  text: string,
  format?: 'canonical' | 'ai',
): { canonical: string; notes?: string; words?: Record<string, string> } | null | undefined {
  const e = load();
  if (!e) return undefined;
  try {
    const r = e.parseBrainReply.call([text, format ?? 'canonical'], 0) as [string, string | null, Record<string, string> | null] | null;
    if (r == null) return null;
    if (!Array.isArray(r) || typeof r[0] !== 'string') return null;
    return {
      canonical: r[0],
      notes: typeof r[1] === 'string' && r[1] ? r[1] : undefined,
      words: r[2] && typeof r[2] === 'object' ? r[2] : undefined,
    };
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return undefined;
  }
}

export function sdevSolveNlRequest(prompt: string): string | null | undefined {
  const e = load();
  if (!e) return undefined;
  try {
    const r = e.solveNlRequest.call([prompt], 0);
    return typeof r === 'string' ? r : null;
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return undefined;
  }
}

export function sdevTranslateLineSpeculative(rawLine: string): {
  line: string;
  openedBlock: boolean;
  closedBlock: boolean;
  reopenedBlock: boolean;
} | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.translateLineSpeculative.call([rawLine], 0) as [string, boolean, boolean, boolean];
    if (!Array.isArray(r) || r.length < 4) return null;
    return {
      line: String(r[0]),
      openedBlock: r[1] === true,
      closedBlock: r[2] === true,
      reopenedBlock: r[3] === true,
    };
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

export function sdevRunMicroBrainTranslation(source: string): { canonical: string; changed: boolean } | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.runMicroBrainTranslation.call([source], 0) as [string, boolean];
    if (!Array.isArray(r) || typeof r[0] !== 'string') return null;
    return { canonical: r[0], changed: r[1] === true };
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

export function sdevMicroBrainAccepts(
  parsesOk: boolean,
  unknownCount: number,
  changed: boolean,
  unresolvedCount: number,
  problemsCount: number,
): boolean | null {
  const e = load();
  if (!e) return null;
  try {
    return e.microBrainAccepts.call([parsesOk, unknownCount, changed, unresolvedCount, problemsCount], 0) === true;
  } catch {
    return null;
  }
}

export function sdevBrainCandidateScore(parsesOk: boolean, unknownCount: number, extraProblemsCount: number): number | null {
  const e = load();
  if (!e) return null;
  try {
    return Number(e.brainCandidateScore.call([parsesOk, unknownCount, extraProblemsCount], 0));
  } catch {
    return null;
  }
}

export function sdevBrainNeedsOnlineFallback(
  hasBest: boolean,
  bestScore: number,
  extraProblemsCount: number,
  bestSource: string,
  draftSource: string,
): boolean | null {
  const e = load();
  if (!e) return null;
  try {
    return e.brainNeedsOnlineFallback.call([hasBest, bestScore, extraProblemsCount, bestSource, draftSource], 0) === true;
  } catch {
    return null;
  }
}

export function sdevReconsiderBrainMode(
  prepBrain: BrainMode,
  lastUsedBrain: 'none' | 'local' | 'online',
  allowOnline: boolean,
  isOnline: boolean,
): BrainMode | null {
  const e = load();
  if (!e) return null;
  try {
    return String(e.reconsiderBrainMode.call([prepBrain, lastUsedBrain, allowOnline, isOnline], 0)) as BrainMode;
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

export function sdevMathRequest(stmt: string, known: Iterable<string> = []): string | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.mathRequest.call([stmt, [...known]], 0);
    return typeof r === 'string' ? r : null;
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

export function sdevTaskRequest(stmt: string, known: Iterable<string> = []): string[] | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.taskRequest.call([stmt, [...known]], 0);
    return Array.isArray(r) ? r.map(String) : null;
  } catch (err) {
    engineError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

export function sdevMemoryUnderstandKey(source: string, extra = ''): string | null {
  const e = load();
  if (!e) return null;
  try {
    return String(e.memoryUnderstandKey.call([source, extra], 0));
  } catch {
    return null;
  }
}

export function sdevMemoryApplyLines(
  source: string,
  linesTome: Record<string, { canonical: string; hits: number }>,
): { source: string; hit: boolean } | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.memoryApplyLines.call([source, linesTome], 0) as [string, boolean];
    if (!Array.isArray(r) || typeof r[0] !== 'string') return null;
    return { source: r[0], hit: r[1] === true };
  } catch {
    return null;
  }
}

export function sdevMemoryLearnNames(canonical: string): string[] | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.memoryLearnNames.call([canonical], 0);
    return Array.isArray(r) ? r.map(String) : null;
  } catch {
    return null;
  }
}

export function sdevPromoteWords(
  pairs: [string, string][],
  canonicalMap: Record<string, string>,
  rename: boolean,
): { names: Record<string, string>; synonyms: Record<string, string[]> } | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.promoteWords.call([pairs, canonicalMap, rename], 0) as [
      Record<string, string>,
      Record<string, string[]>,
    ];
    if (!Array.isArray(r) || r.length < 2) return null;
    return { names: r[0] ?? {}, synonyms: r[1] ?? {} };
  } catch {
    return null;
  }
}

export function sdevBoardsUnmask(source: string, blockLineCounts: number[], texts: string[]): string | null {
  const e = load();
  if (!e) return null;
  try {
    return String(e.boardsUnmask.call([source, blockLineCounts, texts], 0));
  } catch {
    return null;
  }
}

export function sdevBrainInstructions(format?: 'canonical' | 'ai'): string | null {
  const e = load();
  if (!e) return null;
  try {
    return String(e.brainInstructions.call([format ?? 'canonical'], 0));
  } catch {
    return null;
  }
}

export function sdevBrainInput(req: BrainRequest): string | null {
  const e = load();
  if (!e) return null;
  try {
    return String(
      e.brainInput.call(
        [
          req.source,
          req.draft ?? '',
          req.unresolved ?? [],
          JSON.stringify(req.vocabulary ?? {}),
          req.problems ?? [],
          req.format ?? 'canonical',
        ],
        0,
      ),
    );
  } catch {
    return null;
  }
}

export function sdevDoctorSystemPrompt(): string | null {
  const e = load();
  if (!e) return null;
  try {
    return String(e.doctorSystemPrompt.call([], 0));
  } catch {
    return null;
  }
}

export function sdevDoctorUserPrompt(code: string, error?: string, note?: string): string | null {
  const e = load();
  if (!e) return null;
  try {
    return String(e.doctorUserPrompt.call([code, error ?? '', note ?? ''], 0));
  } catch {
    return null;
  }
}

export function sdevParseDoctorFix(rawText: string): FixResult | null | undefined {
  const e = load();
  if (!e) return undefined;
  try {
    const r = e.parseDoctorFix.call([rawText], 0) as [string, string, string, string, string] | null;
    if (!Array.isArray(r) || r.length < 5) return null;
    const conf = r[4] === 'high' || r[4] === 'medium' || r[4] === 'low' ? r[4] : 'medium';
    return {
      fixed_code: String(r[0]),
      explanation: String(r[1]),
      changes: String(r[2]),
      how_it_works: String(r[3]),
      confidence: conf,
    };
  } catch {
    return undefined;
  }
}

export function sdevProbeServerType(baseUrl: string): 'LM Studio' | 'Ollama' | 'llama.cpp' | 'OpenAI-Compatible' | null {
  const e = load();
  if (!e) return null;
  try {
    return String(e.probeServerType.call([baseUrl], 0)) as 'LM Studio' | 'Ollama' | 'llama.cpp' | 'OpenAI-Compatible';
  } catch {
    return null;
  }
}

export function sdevProbeCorsHint(baseUrl: string): string | null {
  const e = load();
  if (!e) return null;
  try {
    return String(e.probeCorsHint.call([baseUrl], 0));
  } catch {
    return null;
  }
}

export function sdevClassifyLineIntent(line: string): { intent: IntentCategory; score: number } | null {
  const e = load();
  if (!e) return null;
  try {
    const r = e.classifyLineIntent.call([line], 0) as [IntentCategory, number];
    if (!Array.isArray(r) || r.length < 2) return null;
    return { intent: r[0], score: Number(r[1]) };
  } catch {
    return null;
  }
}
