// ============================================================================
// SDEV Target-Aware Static Linter & Diagnostic Engine
// ----------------------------------------------------------------------------
// Performs static analysis on SDEV source code without executing it:
//   - SDEV001: Block balance (`sdevCheckBlocks` + delimiter verification)
//   - SDEV002: Lexer / Parser syntax diagnostics
//   - SDEV003: Division or modulo by zero (`/ 0`, `% 0`)
//   - SDEV004: Unreachable code after `yield`/`return`/`yeet`/`break`/`skip`/`continue`/`hurl`
//   - SDEV005: Unused `forge`/`let`/`set` variables
//   - SDEV006: Unknown function calls with "Did you mean '...'?" + quick-fix
//   - SDEV007: Target capability mismatches (e.g. `window()`/`canvas()` on `native-x64`)
//   - SDEV008: Deprecated builtin or keyword usage with replacement hints
//   - SDEV009–SDEV015: Style, arity, builtin shadowing, constant conditions, self-comparison, planned APIs
// ============================================================================

import { Lexer } from './lexer';
import { Parser } from './parser';
import * as AST from './ast';
import { SdevError } from './errors';
import { sdevCheckBlocks, isAiDialect, aiToSdev } from './agent/sdev-engine';
import { stripBoardBlocks } from './hardware/strip';
import { KEYWORD_TOKEN_BY_WORD } from './keywords';
import { createSdevModuleRunner, type SdevModuleRunner } from './sdev-module';
import SDEV_TEXT_SRC from '../../lang/stdlib/v2/text.sdev?raw';
import SDEV_LINTER_SRC from '../../lang/linter/linter.sdev?raw';

let linterRunner: SdevModuleRunner | null = null;
function getLinterRunner(): SdevModuleRunner {
  if (!linterRunner) linterRunner = createSdevModuleRunner(SDEV_TEXT_SRC, SDEV_LINTER_SRC);
  return linterRunner;
}
import {
  findApi,
  suggestNearestApis,
  DIAGNOSTIC_CATALOGUE,
  COMMON_API_ALIASES,
  type ApiTarget,
  type ApiEntry,
} from './registry/api-registry';

export interface LintQuickFix {
  title: string;
  line: number;
  targetText?: string;
  replacement: string;
}

export interface LintDiagnostic {
  code: string;
  title: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  column?: number;
  endColumn?: number;
  suggestion?: string;
  quickFix?: LintQuickFix;
}

export interface LintOptions {
  target?: ApiTarget;
  dialect?: string;
  includeInfo?: boolean;
}

const CORE_SHADOW_PROTECTED = new Set([
  'speak', 'say', 'measure', 'morph', 'gather', 'pluck', 'sift', 'each', 'fold', 'sequence',
]);

const STRICT_ARITY_RULES: Record<string, { min: number; max: number }> = {
  measure: { min: 1, max: 1 },
  morph: { min: 2, max: 2 },
  canvas: { min: 2, max: 2 },
  circle: { min: 3, max: 3 },
  line: { min: 4, max: 4 },
  triangle: { min: 6, max: 6 },
  rect: { min: 4, max: 5 },
  each: { min: 2, max: 2 },
  sift: { min: 2, max: 2 },
  fold: { min: 3, max: 3 },
  root: { min: 1, max: 1 },
  sqrt: { min: 1, max: 1 },
  sin: { min: 1, max: 1 },
  cos: { min: 1, max: 1 },
  tan: { min: 1, max: 1 },
  abs: { min: 1, max: 1 },
  floor: { min: 1, max: 1 },
  ceil: { min: 1, max: 1 },
  round: { min: 1, max: 2 },
  magnitude: { min: 1, max: 1 },
  ground: { min: 1, max: 1 },
  elevate: { min: 1, max: 1 },
  nearby: { min: 1, max: 1 },
};

function stripLineComment(line: string): string {
  return getLinterRunner().callStr('sdev_strip_line_comment', line);
}

function isZeroNode(node: AST.ASTNode): boolean {
  if (node.type === 'NumberLiteral' && node.value === 0) return true;
  if (
    node.type === 'UnaryExpr' &&
    (node.operator === '-' || node.operator === '+') &&
    node.operand.type === 'NumberLiteral' &&
    node.operand.value === 0
  ) {
    return true;
  }
  return false;
}

function isTerminatorStatement(stmt: AST.ASTNode): string | null {
  switch (stmt.type) {
    case 'ReturnStatement':
      return 'yield / return';
    case 'BreakStatement':
      return 'yeet / break';
    case 'ContinueStatement':
      return 'skip / continue';
    case 'RaiseStatement':
      return 'hurl / raise';
    default:
      return null;
  }
}

/**
 * Apply a LintQuickFix to source text and return the updated source.
 */
export function applyQuickFix(source: string, fix: LintQuickFix): string {
  const lines = source.split('\n');
  const idx = fix.line - 1;
  if (idx < 0 || idx >= lines.length) return source;
  if (fix.targetText) {
    lines[idx] = lines[idx].replace(fix.targetText, fix.replacement);
  } else {
    lines[idx] = fix.replacement;
  }
  return lines.join('\n');
}

/**
 * Lint SDEV source code with full AST + line-level + target-capability checks.
 */
export function lintSdevSource(
  source: string,
  options: LintOptions = {}
): LintDiagnostic[] {
  // Board blocks are firmware, read by the hardware reader — not sdev to lint.
  source = stripBoardBlocks(source);
  const diagnostics: LintDiagnostic[] = [];
  const seenKeys = new Set<string>();

  const pushDiag = (diag: LintDiagnostic) => {
    if (options.includeInfo === false && diag.severity === 'info') return;
    const key = `${diag.code}:${diag.line}:${diag.message}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    diagnostics.push(diag);
  };

  const aiMode = options.dialect === 'ai' || isAiDialect(source);
  const rawLines = source.split('\n');

  // ── 1. Block balance check via sdevCheckBlocks + token scan (SDEV001) ────
  try {
    const engineBlockIssues = sdevCheckBlocks(source);
    for (const [line, msg] of engineBlockIssues) {
      pushDiag({
        code: 'SDEV001',
        title: DIAGNOSTIC_CATALOGUE.SDEV001.title,
        severity: 'error',
        message: `Unbalanced block: ${msg}.`,
        line,
        quickFix: {
          title: 'Append closing `;;` delimiter',
          line: rawLines.length,
          replacement: `${rawLines[rawLines.length - 1] ?? ''}\n;;`,
        },
      });
    }
  } catch {
    // Fallback handled below
  }

  let openBlocks = 0;
  let lastOpenBlockLine = 1;
  let openParens = 0;
  let openBrackets = 0;

  rawLines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    const code = stripLineComment(rawLine);
    const trimmed = code.trim();
    if (!trimmed || trimmed.startsWith('!#') || trimmed.startsWith('#!')) return;

    // Track quotes, parens, brackets on the line
    let openQuote: string | null = null;
    for (let i = 0; i < code.length; i++) {
      const ch = code[i];
      if (openQuote) {
        if (ch === '\\') {
          i++;
          continue;
        }
        if (ch === openQuote) openQuote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        openQuote = ch;
        continue;
      }
      if (ch === '(') openParens++;
      else if (ch === ')') openParens--;
      else if (ch === '[') openBrackets++;
      else if (ch === ']') openBrackets--;
    }

    if (openQuote) {
      pushDiag({
        code: 'SDEV002',
        title: DIAGNOSTIC_CATALOGUE.SDEV002.title,
        severity: 'error',
        message: `Unterminated string literal (${openQuote}) on line ${lineNo}.`,
        line: lineNo,
      });
    }

    // Track :: and ;;
    const codeWithoutStrings = code.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
    const opens = (codeWithoutStrings.match(/::/g) || []).length;
    const closes = (codeWithoutStrings.match(/;;/g) || []).length;
    if (opens > 0) lastOpenBlockLine = lineNo;
    openBlocks += opens - closes;
    if (openBlocks < 0) {
      pushDiag({
        code: 'SDEV001',
        title: DIAGNOSTIC_CATALOGUE.SDEV001.title,
        severity: 'error',
        message: 'Extra `;;` closes a block that was never opened.',
        line: lineNo,
      });
      openBlocks = 0;
    }

    // Line-level style/deprecation checks in canonical mode
    if (!aiMode) {
      // SDEV009: `=` instead of `be`
      if (
        /^\s*(?:forge\s+)?[A-Za-z_]\w*\s*=\s*[^=>]/.test(codeWithoutStrings) &&
        !/==|!=|<=|>=/.test(codeWithoutStrings)
      ) {
        const fixed = rawLine.replace(/(\b[A-Za-z_]\w*\s*)=(\s*[^=>])/, '$1be$2');
        pushDiag({
          code: 'SDEV009',
          title: DIAGNOSTIC_CATALOGUE.SDEV009.title,
          severity: 'warning',
          message: 'Use `be` for assignment in canonical SDEV (e.g. `forge x be 5`), not `=`.',
          line: lineNo,
          suggestion: 'be',
          quickFix: {
            title: 'Replace `=` with `be`',
            line: lineNo,
            replacement: fixed,
          },
        });
      }

      // SDEV010: foreign declaration keywords (`function`, `const`)
      const foreignKw = /^\s*(function|const)\s+([A-Za-z_]\w*)/.exec(codeWithoutStrings);
      if (foreignKw) {
        const kw = foreignKw[1];
        const rep = kw === 'function' ? 'conjure' : 'forge';
        pushDiag({
          code: 'SDEV010',
          title: DIAGNOSTIC_CATALOGUE.SDEV010.title,
          severity: 'warning',
          message: `Foreign keyword '${kw}' in canonical SDEV. Did you mean '${rep}'?`,
          line: lineNo,
          suggestion: rep,
          quickFix: {
            title: `Replace '${kw}' with '${rep}'`,
            line: lineNo,
            targetText: kw,
            replacement: rep,
          },
        });
      }

      // SDEV008: legacy `within x be ...` loop
      if (/^\s*within\s+[A-Za-z_]\w*\s+be\b/.test(codeWithoutStrings)) {
        pushDiag({
          code: 'SDEV008',
          title: DIAGNOSTIC_CATALOGUE.SDEV008.title,
          severity: 'warning',
          message: '`within ... be ...` is the legacy loop dialect; prefer `iterate <item> through <list> ::`.',
          line: lineNo,
          suggestion: 'iterate',
        });
      }
    }

    // Fallback regex check for `/ 0` or `% 0` in case AST fails to parse later
    if (/(?:\/|%)\s*0(?![.\d])/.test(codeWithoutStrings)) {
      pushDiag({
        code: 'SDEV003',
        title: DIAGNOSTIC_CATALOGUE.SDEV003.title,
        severity: 'error',
        message: 'Division or modulo by literal zero (`/ 0` or `% 0`).',
        line: lineNo,
      });
    }
  });

  if (openBlocks > 0) {
    pushDiag({
      code: 'SDEV001',
      title: DIAGNOSTIC_CATALOGUE.SDEV001.title,
      severity: 'error',
      message: `${openBlocks} unclosed block${openBlocks > 1 ? 's' : ''} — missing \`;;\` (opened on line ${lastOpenBlockLine}).`,
      line: lastOpenBlockLine,
      quickFix: {
        title: 'Add closing `;;`',
        line: rawLines.length,
        replacement: `${rawLines[rawLines.length - 1] ?? ''}\n;;`,
      },
    });
  }

  if (openParens !== 0) {
    pushDiag({
      code: 'SDEV002',
      title: DIAGNOSTIC_CATALOGUE.SDEV002.title,
      severity: 'error',
      message:
        openParens > 0
          ? `${openParens} unclosed parenthesis \`(\`.`
          : `${-openParens} extra closing parenthesis \`)\`.`,
      line: rawLines.length,
    });
  }

  if (openBrackets !== 0) {
    pushDiag({
      code: 'SDEV002',
      title: DIAGNOSTIC_CATALOGUE.SDEV002.title,
      severity: 'error',
      message:
        openBrackets > 0
          ? `${openBrackets} unclosed bracket \`[\`.`
          : `${-openBrackets} extra closing bracket \`]\`.`,
      line: rawLines.length,
    });
  }

  // ── 2. Parse AST for semantic analysis ───────────────────────────────────
  const preparedSource = stripBoardBlocks(aiMode ? aiToSdev(source) : source);
  let ast: AST.Program | null = null;
  try {
    const tokens = new Lexer(preparedSource).tokenize();
    ast = new Parser(tokens).parse();
  } catch (err) {
    if (err instanceof SdevError) {
      pushDiag({
        code: 'SDEV002',
        title: DIAGNOSTIC_CATALOGUE.SDEV002.title,
        severity: 'error',
        message: err.message.replace(/^\[line \d+(?:, col \d+)?\]\s*/, ''),
        line: err.line || 1,
        column: err.column,
      });
    }
  }

  if (!ast) {
    return diagnostics.sort((a, b) => a.line - b.line);
  }

  // ── 3. Pass 1: Collect declarations (functions, classes, variables, params)
  const definedCallables = new Set<string>();
  const declaredVars = new Map<string, { line: number; used: boolean }>();
  const localScopes = new Set<string>();
  const fixedDecls = new Set<string>();

  const noteVarDecl = (name: string, line: number, isParamOrLoop = false) => {
    if (!name || name === 'self' || name === 'super') return;
    localScopes.add(name);
    if (CORE_SHADOW_PROTECTED.has(name)) {
      pushDiag({
        code: 'SDEV012',
        title: DIAGNOSTIC_CATALOGUE.SDEV012.title,
        severity: 'warning',
        message: `Declaration '${name}' shadows the core SDEV builtin '${name}()'.`,
        line,
      });
    }
    if (!isParamOrLoop && !declaredVars.has(name)) {
      declaredVars.set(name, { line, used: false });
    }
  };

  const markVarUsed = (name: string) => {
    const entry = declaredVars.get(name);
    if (entry) entry.used = true;
  };

  const collectDecls = (node: AST.ASTNode | undefined): void => {
    if (!node || typeof node !== 'object') return;
    switch (node.type) {
      case 'Program':
      case 'BlockStatement':
        for (const s of node.statements) collectDecls(s);
        return;
      case 'FuncDeclaration':
        definedCallables.add(node.name);
        localScopes.add(node.name);
        for (const p of node.params) noteVarDecl(p, node.line, true);
        collectDecls(node.body);
        return;
      case 'ClassDeclaration':
        definedCallables.add(node.name);
        localScopes.add(node.name);
        for (const f of node.fields ?? []) collectDecls(f);
        for (const m of node.methods) {
          definedCallables.add(m.name);
          for (const p of m.params) noteVarDecl(p, m.line, true);
          collectDecls(m.body);
        }
        return;
      case 'LetStatement': {
        const names = node.targets && node.targets.length > 0 ? node.targets : [node.name];
        for (const n of names) {
          noteVarDecl(n, node.line, false);
          if (node.isFixed) fixedDecls.add(n);
          if (
            node.value.type === 'LambdaExpr' ||
            node.value.type === 'CallExpr' ||
            node.value.type === 'Identifier'
          ) {
            definedCallables.add(n);
          }
        }
        collectDecls(node.value);
        return;
      }
      case 'AssignStatement':
        if (node.declare || !localScopes.has(node.name)) {
          noteVarDecl(node.name, node.line, false);
        }
        if (node.value.type === 'LambdaExpr' || node.value.type === 'CallExpr') {
          definedCallables.add(node.name);
        }
        collectDecls(node.value);
        return;
      case 'ForEachStatement':
        for (const v of node.variables ?? [node.variable]) {
          noteVarDecl(v, node.line, true);
        }
        collectDecls(node.iterable);
        collectDecls(node.body);
        if (node.elseBlock) collectDecls(node.elseBlock);
        return;
      case 'ForInStatement':
        noteVarDecl(node.variable, node.line, true);
        collectDecls(node.iterable);
        collectDecls(node.body);
        return;
      case 'ImportStatement':
        if (node.alias) {
          definedCallables.add(node.alias);
          noteVarDecl(node.alias, node.line, true);
        }
        if (node.names) {
          for (const item of node.names) {
            const bound = item.alias ?? item.name;
            definedCallables.add(bound);
            noteVarDecl(bound, node.line, true);
          }
        }
        return;
      case 'TryStatement':
        collectDecls(node.tryBlock);
        if (node.errorVar) noteVarDecl(node.errorVar, node.line, true);
        collectDecls(node.catchBlock);
        for (const h of node.handlers ?? []) {
          if (h.alias) noteVarDecl(h.alias, node.line, true);
          collectDecls(h.body);
        }
        if (node.elseBlock) collectDecls(node.elseBlock);
        if (node.finallyBlock) collectDecls(node.finallyBlock);
        return;
      case 'IfStatement':
        collectDecls(node.condition);
        collectDecls(node.thenBranch);
        if (node.elseBranch) collectDecls(node.elseBranch);
        return;
      case 'WhileStatement':
        collectDecls(node.condition);
        collectDecls(node.body);
        if (node.elseBlock) collectDecls(node.elseBlock);
        return;
      case 'LambdaExpr':
        for (const p of node.params) noteVarDecl(p, node.line, true);
        collectDecls(node.body);
        return;
      default: {
        const rec = node as unknown as Record<string, unknown>;
        for (const key of Object.keys(rec)) {
          const val = rec[key];
          if (Array.isArray(val)) {
            for (const item of val) {
              if (item && typeof item === 'object' && 'type' in item) {
                collectDecls(item as AST.ASTNode);
              }
            }
          } else if (val && typeof val === 'object' && 'type' in val) {
            collectDecls(val as AST.ASTNode);
          }
        }
      }
    }
  };

  collectDecls(ast);

  // ── 4. Pass 2: Semantic Walk (SDEV003, SDEV004, SDEV006, SDEV007, SDEV008, SDEV011, SDEV013, SDEV014, SDEV015)
  const checkStatementSequence = (stmts: AST.ASTNode[]) => {
    let terminatedBy: { kind: string; line: number } | null = null;
    for (const stmt of stmts) {
      if (terminatedBy) {
        pushDiag({
          code: 'SDEV004',
          title: DIAGNOSTIC_CATALOGUE.SDEV004.title,
          severity: 'warning',
          message: `Unreachable code after \`${terminatedBy.kind}\` on line ${terminatedBy.line}.`,
          line: stmt.line,
        });
        // Only warn on the first unreachable statement in the block
        terminatedBy = null;
      }
      walkNode(stmt);
      const term = isTerminatorStatement(stmt);
      if (term) {
        terminatedBy = { kind: term, line: stmt.line };
      }
    }
  };

  const inspectCall = (callNode: AST.CallExpr) => {
    let calleeName: string | null = null;
    if (callNode.callee.type === 'Identifier') {
      calleeName = callNode.callee.name;
      markVarUsed(calleeName);
    } else if (
      callNode.callee.type === 'MemberExpr' &&
      callNode.callee.object.type === 'Identifier'
    ) {
      markVarUsed(callNode.callee.object.name);
      const dotted = `${callNode.callee.object.name}.${callNode.callee.property}`;
      if (COMMON_API_ALIASES[dotted]) {
        calleeName = dotted;
      }
    }

    if (!calleeName) return;

    // Skip user-defined functions/classes/variables
    if (definedCallables.has(calleeName) || localScopes.has(calleeName)) {
      return;
    }

    const api: ApiEntry | undefined = findApi(calleeName);

    // Unknown function call -> SDEV006 with "Did you mean '...'?"
    if (!api) {
      // Ignore internal compiler helpers
      if (calleeName.startsWith('__')) return;
      const suggestions = suggestNearestApis(calleeName, 3);
      const top = suggestions[0];
      const hintText = top ? ` Did you mean '${top.matchedName}'?` : '';
      const rawLine = rawLines[callNode.line - 1] ?? '';

      pushDiag({
        code: 'SDEV006',
        title: DIAGNOSTIC_CATALOGUE.SDEV006.title,
        severity: 'error',
        message: `Unknown function '${calleeName}()'.${hintText}`,
        line: callNode.line,
        suggestion: top?.matchedName,
        ...(top
          ? {
              quickFix: {
                title: `Replace '${calleeName}' with '${top.matchedName}'`,
                line: callNode.line,
                targetText: calleeName,
                replacement: top.matchedName,
              },
            }
          : {}),
      });
      return;
    }

    // SDEV008: Deprecated API usage
    if (api.deprecated) {
      pushDiag({
        code: 'SDEV008',
        title: DIAGNOSTIC_CATALOGUE.SDEV008.title,
        severity: 'warning',
        message: `'${api.name}()' is deprecated since v${api.deprecated.since}: ${api.deprecated.reason} Did you mean '${api.deprecated.replacement}()'?`,
        line: callNode.line,
        suggestion: api.deprecated.replacement,
        quickFix: {
          title: `Replace '${api.name}' with '${api.deprecated.replacement}'`,
          line: callNode.line,
          targetText: api.name,
          replacement: api.deprecated.replacement,
        },
      });
    }

    // SDEV015: Planned API usage
    if (api.status === 'planned') {
      pushDiag({
        code: 'SDEV015',
        title: DIAGNOSTIC_CATALOGUE.SDEV015.title,
        severity: 'info',
        message: `'${api.name}()' (module '${api.module}') is currently marked as 'planned' on the SDEV roadmap.`,
        line: callNode.line,
      });
    }

    // SDEV007: Target capability mismatch
    if (options.target && !api.targets.includes(options.target)) {
      pushDiag({
        code: 'SDEV007',
        title: DIAGNOSTIC_CATALOGUE.SDEV007.title,
        severity: 'error',
        message: `Target capability mismatch: '${api.name}()' (module '${api.module}') is not supported on target '${options.target}'. Supported targets: ${api.targets.join(', ')}.`,
        line: callNode.line,
      });
    }

    // SDEV011: Strict arity check
    const arity = STRICT_ARITY_RULES[api.name];
    if (arity) {
      const argc = callNode.args.length;
      if (argc < arity.min || argc > arity.max) {
        const expected =
          arity.min === arity.max ? `${arity.min}` : `${arity.min}–${arity.max}`;
        pushDiag({
          code: 'SDEV011',
          title: DIAGNOSTIC_CATALOGUE.SDEV011.title,
          severity: 'error',
          message: `'${api.name}()' expects ${expected} argument${arity.max === 1 ? '' : 's'}, but got ${argc}. Signature: ${api.signature}`,
          line: callNode.line,
        });
      }
    }
  };

  const walkNode = (node: AST.ASTNode | undefined): void => {
    if (!node || typeof node !== 'object') return;

    switch (node.type) {
      case 'Program':
      case 'BlockStatement':
        checkStatementSequence(node.statements);
        return;

      case 'Identifier':
        markVarUsed(node.name);
        return;

      case 'LetStatement':
        walkNode(node.value);
        return;

      case 'AssignStatement':
        if (fixedDecls.has(node.name)) {
          pushDiag({
            code: 'SDEV014',
            title: 'Reassignment of immutable variable',
            severity: 'error',
            message: `Cannot reassign fixed variable '${node.name}'`,
            line: node.line,
          });
        }
        if (
          node.value.type === 'Identifier' &&
          node.value.name === node.name &&
          !node.declare
        ) {
          pushDiag({
            code: 'SDEV014',
            title: DIAGNOSTIC_CATALOGUE.SDEV014.title,
            severity: 'warning',
            message: `Self-assignment: '${node.name} be ${node.name}' has no effect.`,
            line: node.line,
          });
        }
        walkNode(node.value);
        return;

      case 'BinaryExpr':
        if (
          (node.operator === '/' || node.operator === '%') &&
          isZeroNode(node.right)
        ) {
          pushDiag({
            code: 'SDEV003',
            title: DIAGNOSTIC_CATALOGUE.SDEV003.title,
            severity: 'error',
            message: `Division or modulo by zero (\`${node.operator} 0\`).`,
            line: node.line,
          });
        }
        if (
          (node.operator === 'equals' ||
            node.operator === '==' ||
            node.operator === 'differs' ||
            node.operator === '!=') &&
          node.left.type === 'Identifier' &&
          node.right.type === 'Identifier' &&
          node.left.name === node.right.name
        ) {
          pushDiag({
            code: 'SDEV014',
            title: DIAGNOSTIC_CATALOGUE.SDEV014.title,
            severity: 'warning',
            message: `Comparing '${node.left.name}' to itself with '${node.operator}' is always constant.`,
            line: node.line,
          });
        }
        walkNode(node.left);
        walkNode(node.right);
        return;

      case 'IfStatement':
        if (node.condition.type === 'BooleanLiteral') {
          pushDiag({
            code: 'SDEV013',
            title: DIAGNOSTIC_CATALOGUE.SDEV013.title,
            severity: 'warning',
            message: `Constant condition \`${node.condition.value ? 'yep' : 'nope'}\` in \`ponder\` statement.`,
            line: node.line,
          });
        }
        walkNode(node.condition);
        walkNode(node.thenBranch);
        if (node.elseBranch) walkNode(node.elseBranch);
        return;

      case 'WhileStatement':
        if (node.condition.type === 'BooleanLiteral' && !node.condition.value) {
          pushDiag({
            code: 'SDEV013',
            title: DIAGNOSTIC_CATALOGUE.SDEV013.title,
            severity: 'warning',
            message: 'Constant `nope` condition in `cycle` loop — loop body will never execute.',
            line: node.line,
          });
        }
        walkNode(node.condition);
        walkNode(node.body);
        if (node.elseBlock) walkNode(node.elseBlock);
        return;

      case 'CallExpr':
        inspectCall(node);
        if (node.callee.type !== 'Identifier') walkNode(node.callee);
        for (const arg of node.args) walkNode(arg);
        return;

      case 'FuncDeclaration':
        walkNode(node.body);
        return;

      case 'ClassDeclaration':
        for (const f of node.fields ?? []) walkNode(f);
        for (const m of node.methods) walkNode(m.body);
        return;

      default: {
        const rec = node as unknown as Record<string, unknown>;
        for (const key of Object.keys(rec)) {
          const val = rec[key];
          if (Array.isArray(val)) {
            for (const item of val) {
              if (item && typeof item === 'object') {
                if ('type' in item) walkNode(item as AST.ASTNode);
                else {
                  for (const sub of Object.values(item as Record<string, unknown>)) {
                    if (sub && typeof sub === 'object' && 'type' in sub) {
                      walkNode(sub as AST.ASTNode);
                    }
                  }
                }
              }
            }
          } else if (val && typeof val === 'object' && 'type' in val) {
            walkNode(val as AST.ASTNode);
          }
        }
      }
    }
  };

  walkNode(ast);

  // ── 5. Check unused variables (SDEV005) ──────────────────────────────────
  for (const [name, info] of declaredVars.entries()) {
    if (name.startsWith('_')) continue;
    if (KEYWORD_TOKEN_BY_WORD[name]) continue;
    if (!info.used) {
      const rawLine = rawLines[info.line - 1] ?? '';
      pushDiag({
        code: 'SDEV005',
        title: DIAGNOSTIC_CATALOGUE.SDEV005.title,
        severity: 'warning',
        message: `Variable '${name}' is declared but never used. Prefix with '_${name}' if intentional.`,
        line: info.line,
        suggestion: `_${name}`,
        quickFix: {
          title: `Rename '${name}' to '_${name}'`,
          line: info.line,
          targetText: name,
          replacement: `_${name}`,
        },
      });
    }
  }

  return diagnostics.sort((a, b) => a.line - b.line);
}
