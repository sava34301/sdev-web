/**
 * SDEV Studio Execution Engine (`src/studio/runner.ts`)
 *
 * Executes SDEV source code through the real SDEV language engine (`Lexer`,
 * `Parser`, `Interpreter`, `execute`, `executeAsync`, `executeV2`) while
 * simultaneously producing:
 *   1. Chrono Trace — time-travel step-by-step execution snapshots with
 *      variable bindings, call stack depth, output stream, and line highlights.
 *   2. Live Lens — per-line inline evaluated values, variable assignments,
 *      and execution hit counts.
 *   3. Prism AST — structured AST inspector tree, token metrics, and
 *      canonical linter diagnostics (`lintSdevSource`).
 */

import {
  Lexer,
  Parser,
  Interpreter,
  SdevError,
  execute,
  executeAsync,
  executeV2,
  detectLanguage,
  translateSource,
  type Token,
} from '@/lang';
// The studio inspects nodes from several parser generations, so it reads them loosely.
type LooseNode = { type: string; [key: string]: any };
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace AST {
  type ASTNode = LooseNode;
  type Program = LooseNode & { body: LooseNode[] };
  type AssignStatement = LooseNode;
  type LetStatement = LooseNode;
}
import { stringify } from '@/lang/builtins';
import {
  createGraphicsBuiltins,
  type GraphicsCommand,
  type TurtleState,
} from '@/lang/graphics';
import { createUiBuiltins, type UiState } from '@/lang/ui';
import { createWebBuiltins, type WebState } from '@/lang/web';
import { stripSignature } from '@/lang/dialect/signature';
import { lintSdevSource, type LintDiagnostic } from '@/lang/linter';
import type { ApiTarget } from '@/lang/registry/api-registry';

// ============================================================
// Types
// ============================================================

export interface ChronoVariable {
  name: string;
  value: string;
  type: string;
  scope: 'local' | 'global';
  changed?: boolean;
}

export interface ChronoStep {
  /** 0-based sequential step index */
  index: number;
  /** 1-based source line number */
  line: number;
  /** AST node type executed at this step */
  nodeType: string;
  /** Source text of the line */
  code: string;
  /** Human-readable summary of the step */
  summary: string;
  /** Snapshot of user variables visible at the end of this step */
  variables: Record<string, string>;
  /** Detailed variable records with type & change tracking */
  variableList: ChronoVariable[];
  /** Call stack names (top-most last) */
  callStack: string[];
  /** Console outputs accumulated up to and including this step */
  outputSnapshot: string[];
  /** Formatted result of this step, if any */
  resultValue?: string;
  /** Elapsed time in ms since execution start */
  elapsedMs: number;
}

export interface LiveLensEntry {
  /** 1-based line number */
  line: number;
  /** Number of times this line was executed */
  hits: number;
  /** Most recent formatted value or assignment summary on this line */
  display: string;
  /** Raw formatted values from each pass (up to last 8) */
  history: string[];
  /** Kind of lens annotation */
  kind: 'assign' | 'output' | 'return' | 'condition' | 'expr';
}

export interface PrismNode {
  id: string;
  type: string;
  label: string;
  line: number;
  detail?: string;
  children: PrismNode[];
}

export interface PrismReport {
  ast: AST.Program | null;
  tree: PrismNode | null;
  tokenCount: number;
  statementCount: number;
  nodeCount: number;
  nodeCountsByType: Record<string, number>;
  detectedLanguage: string | null;
}

export interface StudioRunOptions {
  /** Runtime engine: 'v1' (tree-walk with full Chrono trace) or 'v2' (self-hosted WASM + Chrono trace) */
  runtime?: 'v1' | 'v2';
  /** Target platform for lint diagnostics */
  target?: ApiTarget;
  /** Maximum number of Chrono steps to record (default: 500) */
  maxChronoSteps?: number;
  /** Source spoken language override */
  sourceLanguage?: string;
}

export interface StudioRunResult {
  success: boolean;
  output: string[];
  error?: string;
  errorLine?: number;
  durationMs: number;
  runtime: 'v1' | 'v2';
  /** Time-travel execution steps */
  chrono: ChronoStep[];
  /** Per-line inline Live Lens annotations (keyed by 1-based line number) */
  liveLens: Record<number, LiveLensEntry>;
  /** Ordered array of Live Lens entries */
  liveLensList: LiveLensEntry[];
  /** Prism AST & token inspection report */
  prism: PrismReport;
  /** Canonical linter diagnostics */
  diagnostics: LintDiagnostic[];
  /** Graphics, Turtle, UI, and Web state emitted during execution */
  canvasCommands: GraphicsCommand[];
  turtleState?: TurtleState;
  uiStates: UiState[];
  webStates: WebState[];
}

// ============================================================
// Statement & Value Helpers
// ============================================================

const TRACED_STATEMENT_TYPES = new Set<string>([
  'LetStatement',
  'AssignStatement',
  'IndexAssignStatement',
  'MemberAssignStatement',
  'AugAssignStatement',
  'DestructureStatement',
  'IfStatement',
  'WhileStatement',
  'RepeatStatement',
  'ForEachStatement',
  'ForInStatement',
  'ReturnStatement',
  'EmitStatement',
  'BreakStatement',
  'ContinueStatement',
  'FuncDeclaration',
  'ClassDeclaration',
  'TryStatement',
  'RaiseStatement',
  'AssertStatement',
  'DeleteStatement',
  'MatchStatement',
  'ExpressionStatement',
]);

function inferValueType(val: unknown): string {
  if (val === null || val === undefined) return 'void';
  if (typeof val === 'number') return 'num';
  if (typeof val === 'string') return 'text';
  if (typeof val === 'boolean') return 'truth';
  if (Array.isArray(val)) return `list[${val.length}]`;
  if (val instanceof Uint8Array) return `bytes[${val.length}]`;
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>;
    if (o.type === 'builtin' || o.type === 'function' || o.type === 'lambda') return 'conjure';
    if (o.type === 'class') return `class ${String(o.name ?? '')}`.trim();
    if (o.type === 'instance') {
      const k = o.klass as { name?: string } | undefined;
      return k?.name ? `instance<${k.name}>` : 'instance';
    }
    return 'tome';
  }
  return typeof val;
}

function formatShortValue(val: unknown, maxLen = 64): string {
  try {
    if (typeof val === 'string') {
      const s = JSON.stringify(val);
      return s.length > maxLen ? s.slice(0, maxLen - 1) + '…"' : s;
    }
    const text = stringify(val);
    return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
  } catch {
    return String(val);
  }
}

interface InternalEnv {
  values?: Map<string, unknown>;
  parent?: InternalEnv;
}

function captureEnvVariables(
  env: InternalEnv,
  globalEnv: InternalEnv,
  initialGlobals: Map<string, unknown>,
  prevVars: Record<string, string>
): { map: Record<string, string>; list: ChronoVariable[] } {
  const map: Record<string, string> = {};
  const list: ChronoVariable[] = [];
  const seen = new Set<string>();

  // Walk from inner-most environment out to globalEnv
  const chain: { env: InternalEnv; isGlobal: boolean }[] = [];
  let cursor: InternalEnv | undefined = env;
  while (cursor) {
    chain.push({ env: cursor, isGlobal: cursor === globalEnv });
    cursor = cursor.parent;
  }

  for (const { env: frame, isGlobal } of chain) {
    if (!frame.values) continue;
    for (const [name, rawVal] of frame.values.entries()) {
      if (seen.has(name)) continue;
      if (
        isGlobal &&
        initialGlobals.has(name) &&
        Object.is(initialGlobals.get(name), rawVal)
      ) {
        continue;
      }
      if (name.startsWith('__')) continue;
      if (
        rawVal &&
        typeof rawVal === 'object' &&
        (rawVal as { type?: string }).type === 'builtin'
      ) {
        continue;
      }
      seen.add(name);
      const formatted = formatShortValue(rawVal, 80);
      map[name] = formatted;
      list.push({
        name,
        value: formatted,
        type: inferValueType(rawVal),
        scope: isGlobal ? 'global' : 'local',
        changed: prevVars[name] !== formatted,
      });
    }
  }

  return { map, list };
}

function buildStepSummary(node: AST.ASTNode, result: unknown, sourceLine: string): string {
  switch (node.type) {
    case 'LetStatement':
      return `forge ${node.name} = ${formatShortValue(result)}`;
    case 'AssignStatement':
      return `${node.name} ← ${formatShortValue(result)}`;
    case 'AugAssignStatement':
      return `${node.operator}= assignment → ${formatShortValue(result)}`;
    case 'FuncDeclaration':
      return `conjure ${node.name}(${node.params.join(', ')})`;
    case 'ClassDeclaration':
      return `craft ${node.name}`;
    case 'ReturnStatement':
      return `yield ${formatShortValue(result)}`;
    case 'IfStatement':
      return `ponder condition`;
    case 'WhileStatement':
      return `cycle loop`;
    case 'ForEachStatement':
      return `for ${node.variable} through collection`;
    case 'ForInStatement':
      return `for ${node.variable} in iterable`;
    case 'ExpressionStatement':
      return sourceLine.trim() || 'expression';
    default:
      return sourceLine.trim() || node.type;
  }
}

// ============================================================
// Prism AST Builder
// ============================================================

function buildPrismTree(program: AST.Program): {
  tree: PrismNode;
  nodeCount: number;
  nodeCountsByType: Record<string, number>;
} {
  let counter = 0;
  const counts: Record<string, number> = {};

  function visit(node: unknown, fallbackLine = 1): PrismNode {
    const n = (node ?? {}) as Record<string, unknown>;
    const type = typeof n.type === 'string' ? n.type : 'Node';
    const line = typeof n.line === 'number' ? n.line : fallbackLine;
    counts[type] = (counts[type] ?? 0) + 1;
    counter++;

    let label = type;
    let detail: string | undefined;

    if (typeof n.name === 'string') {
      label = `${type} (${n.name})`;
    } else if (type === 'NumberLiteral' || type === 'StringLiteral' || type === 'BooleanLiteral') {
      detail = JSON.stringify(n.value);
      label = `${type}: ${detail}`;
    } else if (type === 'Identifier') {
      label = `Identifier (${String(n.name ?? '')})`;
    } else if (type === 'BinaryExpr' || type === 'UnaryExpr') {
      label = `${type} [${String(n.operator ?? '')}]`;
    } else if (type === 'CallExpr') {
      const callee = n.callee as { type?: string; name?: string } | undefined;
      if (callee?.type === 'Identifier' && callee.name) {
        label = `CallExpr (${callee.name})`;
      }
    }

    const children: PrismNode[] = [];
    for (const [key, val] of Object.entries(n)) {
      if (key === 'type' || key === 'line' || key === 'column') continue;
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === 'object' && 'type' in (item as Record<string, unknown>)) {
            children.push(visit(item, line));
          }
        }
      } else if (val && typeof val === 'object' && 'type' in (val as Record<string, unknown>)) {
        children.push(visit(val, line));
      }
    }

    return {
      id: `prism-${counter}`,
      type,
      label,
      line,
      detail,
      children,
    };
  }

  const tree = visit(program, 1);
  return { tree, nodeCount: counter, nodeCountsByType: counts };
}

// ============================================================
// Core Runner Implementation (Chrono + Live Lens + Prism)
// ============================================================

function executeWithTracing(
  rawSource: string,
  options: StudioRunOptions = {}
): StudioRunResult {
  const startTime = performance.now();
  const maxSteps = options.maxChronoSteps ?? 500;
  const runtime = options.runtime ?? 'v1';

  const stripped = stripSignature(rawSource);
  const detectedLanguage = options.sourceLanguage ?? detectLanguage(stripped);
  let executableSource = stripped;
  if (detectedLanguage && detectedLanguage !== 'English') {
    executableSource = translateSource(stripped, detectedLanguage).translated;
  }

  const sourceLines = stripped.split(/\r?\n/);
  const diagnostics = lintSdevSource(stripped, {
    target: options.target,
  });

  const outputs: string[] = [];
  const canvasCommands: GraphicsCommand[] = [];
  let turtle: TurtleState = {
    x: 200,
    y: 200,
    angle: 0,
    penDown: true,
    color: '#00ff88',
    width: 2,
  };
  const uiStates: UiState[] = [];
  const webStates: WebState[] = [];

  const chrono: ChronoStep[] = [];
  const liveLens: Record<number, LiveLensEntry> = {};

  let tokens: Token[] = [];
  let ast: AST.Program | null = null;

  try {
    const lexer = new Lexer(executableSource);
    tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    ast = parser.parse();
  } catch (err) {
    const durationMs = performance.now() - startTime;
    const errorMsg = err instanceof SdevError ? err.message : String(err);
    const errorLine = err instanceof SdevError ? err.line : undefined;
    return {
      success: false,
      output: outputs,
      error: errorMsg,
      errorLine,
      durationMs,
      runtime,
      chrono,
      liveLens,
      liveLensList: [],
      prism: {
        ast: null,
        tree: null,
        tokenCount: tokens.length,
        statementCount: 0,
        nodeCount: 0,
        nodeCountsByType: {},
        detectedLanguage,
      },
      diagnostics,
      canvasCommands,
      turtleState: turtle,
      uiStates,
      webStates,
    };
  }

  const prismData = buildPrismTree(ast);
  const prism: PrismReport = {
    ast,
    tree: prismData.tree,
    tokenCount: tokens.length,
    statementCount: ast.statements.length,
    nodeCount: prismData.nodeCount,
    nodeCountsByType: prismData.nodeCountsByType,
    detectedLanguage,
  };

  let lastOutputOnCurrentStep: string | null = null;
  const interpreter = new Interpreter((msg: string) => {
    outputs.push(msg);
    lastOutputOnCurrentStep = msg;
  });

  const globalEnv = interpreter.getGlobalEnv();
  const gfxBuiltins = createGraphicsBuiltins(
    (cmd: GraphicsCommand) => canvasCommands.push(cmd),
    () => turtle,
    (patch: Partial<TurtleState>) => {
      turtle = { ...turtle, ...patch };
    }
  );
  gfxBuiltins.forEach((fn, name) => globalEnv.define(name, fn));

  const uiBuiltins = createUiBuiltins(
    (st: UiState) => uiStates.push(st),
    () => 0
  );
  uiBuiltins.forEach((fn, name) => globalEnv.define(name, fn));

  const webBuiltins = createWebBuiltins((st: WebState) => webStates.push(st));
  webBuiltins.forEach((fn, name) => globalEnv.define(name, fn));

  // Snapshot initial globals so Chrono only displays user-created/modified bindings
  const initialGlobals = new Map<string, unknown>();
  const internalGlobal = globalEnv as unknown as InternalEnv;
  if (internalGlobal.values) {
    for (const [k, v] of internalGlobal.values.entries()) {
      initialGlobals.set(k, v);
    }
  }

  const callStack: string[] = ['<main>'];
  let prevVars: Record<string, string> = {};

  function recordLens(
    line: number,
    display: string,
    kind: LiveLensEntry['kind']
  ): void {
    if (line < 1) return;
    const existing = liveLens[line];
    if (existing) {
      existing.hits += 1;
      existing.display = display;
      existing.kind = kind;
      existing.history.push(display);
      if (existing.history.length > 8) existing.history.shift();
    } else {
      liveLens[line] = {
        line,
        hits: 1,
        display,
        history: [display],
        kind,
      };
    }
  }

  // Hook into Interpreter's generator evaluator `ev` to capture Chrono & Live Lens
  const interpAny = interpreter as unknown as {
    ev: (node: AST.ASTNode, env: InternalEnv) => Generator<unknown, unknown, unknown>;
    callFunction?: (fn: unknown, args: unknown[], line: number) => unknown;
  };
  const origEv = interpAny.ev.bind(interpreter);

  interpAny.ev = function* tracedEv(
    node: AST.ASTNode,
    env: InternalEnv
  ): Generator<unknown, unknown, unknown> {
    const isStatement = TRACED_STATEMENT_TYPES.has(node.type);
    const prevOutputLen = outputs.length;
    lastOutputOnCurrentStep = null;

    const result = yield* origEv(node, env);

    if (isStatement && node.line >= 1) {
      const lineIdx = node.line - 1;
      const codeLine = sourceLines[lineIdx] ?? '';

      // Update Live Lens for this line
      if (node.type === 'LetStatement' || node.type === 'AssignStatement') {
        const varName = (node as AST.LetStatement | AST.AssignStatement).name;
        recordLens(node.line, `${varName} = ${formatShortValue(result)}`, 'assign');
      } else if (node.type === 'AugAssignStatement') {
        recordLens(node.line, `→ ${formatShortValue(result)}`, 'assign');
      } else if (node.type === 'ReturnStatement') {
        recordLens(node.line, `yield ${formatShortValue(result)}`, 'return');
      } else if (outputs.length > prevOutputLen && lastOutputOnCurrentStep !== null) {
        recordLens(node.line, `🖨 ${lastOutputOnCurrentStep}`, 'output');
      } else if (node.type === 'ExpressionStatement' && result !== null && result !== undefined) {
        recordLens(node.line, formatShortValue(result), 'expr');
      } else if (
        node.type === 'IfStatement' ||
        node.type === 'WhileStatement' ||
        node.type === 'ForEachStatement' ||
        node.type === 'ForInStatement'
      ) {
        recordLens(node.line, buildStepSummary(node, result, codeLine), 'condition');
      }

      // Record Chrono step (up to maxSteps)
      if (chrono.length < maxSteps) {
        const { map: varsMap, list: varsList } = captureEnvVariables(
          env,
          internalGlobal,
          initialGlobals,
          prevVars
        );
        prevVars = varsMap;
        chrono.push({
          index: chrono.length,
          line: node.line,
          nodeType: node.type,
          code: codeLine.trim(),
          summary: buildStepSummary(node, result, codeLine),
          variables: varsMap,
          variableList: varsList,
          callStack: [...callStack],
          outputSnapshot: [...outputs],
          resultValue:
            result !== null && result !== undefined ? formatShortValue(result) : undefined,
          elapsedMs: Number((performance.now() - startTime).toFixed(2)),
        });
      }
    }

    return result;
  };

  try {
    interpreter.interpret(ast);
    const durationMs = Number((performance.now() - startTime).toFixed(2));
    return {
      success: true,
      output: outputs,
      durationMs,
      runtime,
      chrono,
      liveLens,
      liveLensList: Object.values(liveLens).sort((a, b) => a.line - b.line),
      prism,
      diagnostics,
      canvasCommands,
      turtleState: turtle,
      uiStates,
      webStates,
    };
  } catch (err) {
    const durationMs = Number((performance.now() - startTime).toFixed(2));
    const errorMsg = err instanceof SdevError ? err.message : String(err);
    const errorLine = err instanceof SdevError ? err.line : undefined;
    return {
      success: false,
      output: outputs,
      error: errorMsg,
      errorLine,
      durationMs,
      runtime,
      chrono,
      liveLens,
      liveLensList: Object.values(liveLens).sort((a, b) => a.line - b.line),
      prism,
      diagnostics,
      canvasCommands,
      turtleState: turtle,
      uiStates,
      webStates,
    };
  }
}

/**
 * Synchronous Studio execution: runs SDEV code through the real SDEV engine
 * and returns output, Chrono time-travel trace, Live Lens line values,
 * Prism AST, and linter diagnostics.
 */
export function runStudioCode(
  source: string,
  options: StudioRunOptions = {}
): StudioRunResult {
  const traced = executeWithTracing(source, options);

  // If traced execution had a syntax/dialect failure that the agent-assisted
  // canonical `execute()` can resolve, fall back to `execute()` for output.
  if (!traced.success && traced.output.length === 0) {
    const fallback = execute(source, { sourceLanguage: options.sourceLanguage });
    if (fallback.success) {
      return {
        ...traced,
        success: true,
        output: fallback.output,
        error: undefined,
        errorLine: undefined,
      };
    }
  }

  return traced;
}

/**
 * Asynchronous Studio execution: supports both v1 (with full agent understanding
 * via `executeAsync`) and v2 (the self-hosted WASM seed VM via `executeV2`),
 * combined with Chrono trace, Live Lens, and Prism AST inspection.
 */
export async function runStudioCodeAsync(
  source: string,
  options: StudioRunOptions = {}
): Promise<StudioRunResult> {
  const traced = executeWithTracing(source, options);

  if (options.runtime === 'v2') {
    try {
      const v2Result = await executeV2(source, { sourceLanguage: options.sourceLanguage });
      if (v2Result.success) {
        return {
          ...traced,
          success: true,
          runtime: 'v2',
          output: v2Result.output,
          error: undefined,
          errorLine: undefined,
        };
      }
    } catch {
      // Fall back cleanly to traced v1 result when WASM seed is unavailable in headless env
    }
  } else if (!traced.success) {
    const asyncResult = await executeAsync(source, { sourceLanguage: options.sourceLanguage });
    if (asyncResult.success) {
      return {
        ...traced,
        success: true,
        output: asyncResult.output,
        error: undefined,
        errorLine: undefined,
      };
    }
  }

  return traced;
}

// Convenience aliases for Studio components
export const runSdevStudio = runStudioCode;
export const runSdevStudioAsync = runStudioCodeAsync;
