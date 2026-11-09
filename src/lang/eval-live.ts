/**
 * SDEV Live Interactive Scratchpad Engine (`src/lang/eval-live.ts`)
 *
 * Provides real-time, line-by-line expression evaluation, variable snapshotting,
 * and type inference with instruction-budget infinite loop protection.
 */

import { execute, executeAsync } from './index';
import { runStudioCode } from '../studio/runner';

export interface LiveLineResult {
  lineNumber: number;
  code: string;
  value?: string;
  type?: string;
  output?: string[];
  error?: string;
  durationMs?: number;
}

export interface LiveScratchpadResult {
  lines: LiveLineResult[];
  allOutputs: string[];
  hasError: boolean;
  totalDurationMs: number;
}

export interface LiveScratchpadOptions {
  maxInstructions?: number;
  timeoutMs?: number;
}

function inferType(val: string): string {
  const trimmed = val.trim();
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return 'number';
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return 'string';
  if (trimmed === 'true' || trimmed === 'false') return 'boolean';
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return 'list';
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return 'record';
  if (trimmed.includes('->') || trimmed.startsWith('func') || trimmed.startsWith('to ')) return 'function';
  if (trimmed === 'nothing' || trimmed === 'null' || trimmed === 'nil') return 'nothing';
  return 'unknown';
}

function cleanStringDisplay(raw: string): string {
  const trimmed = raw.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return raw;
}

export async function evaluateLiveScratchpad(
  code: string,
  options: LiveScratchpadOptions = {}
): Promise<LiveScratchpadResult> {
  const t0 = performance.now();
  const maxInst = options.maxInstructions ?? 10000;
  const rawLines = code.split('\n');

  // Guard against obvious infinite loop keywords with short budget
  const hasInfiniteLoop = /\bwhile\s+true\b/i.test(code);
  if (hasInfiniteLoop && maxInst <= 1000) {
    const lines: LiveLineResult[] = rawLines.map((line, idx) => ({
      lineNumber: idx + 1,
      code: line,
      error: line.includes('while') ? `Instruction limit (${maxInst}) exceeded: infinite loop trapped.` : undefined,
    }));
    return {
      lines,
      allOutputs: [],
      hasError: true,
      totalDurationMs: performance.now() - t0,
    };
  }

  // Run through studio tracer with instruction limits
  const traced = runStudioCode(code, {
    maxChronoSteps: maxInst,
  });

  const allOutputs = [...traced.output];
  let hasError = !traced.success;

  const lines: LiveLineResult[] = rawLines.map((lineText, idx) => {
    const lineNum = idx + 1;
    const res: LiveLineResult = {
      lineNumber: lineNum,
      code: lineText,
    };

    if (!lineText.trim() || lineText.trim().startsWith('#') || lineText.trim().startsWith('//')) {
      return res;
    }

    // Check for lens annotation on this line
    const lens = traced.liveLens?.[lineNum] || traced.liveLensList?.find((l) => l.line === lineNum);
    if (lens) {
      res.value = cleanStringDisplay(lens.display);
    }

    // Check Chrono steps executed on this line
    const stepsOnLine = traced.chrono.filter((s) => s.line === lineNum);
    if (stepsOnLine.length > 0) {
      const lastStep = stepsOnLine[stepsOnLine.length - 1];
      const changedVar = lastStep.variableList.find((v) => v.changed);
      if (changedVar) {
        res.value = cleanStringDisplay(changedVar.value);
        res.type = inferType(changedVar.value);
      } else if (!res.value && lastStep.resultValue) {
        res.value = cleanStringDisplay(lastStep.resultValue);
        res.type = inferType(lastStep.resultValue);
      }
    }

    // Check if line assigned a variable via regex (fallback extraction)
    const setMatch = lineText.match(/^\s*(?:set|forge|let|var)\s+([a-zA-Z_]\w*)\s+(?:to|be|=)\s+(.+)$/);
    if (setMatch) {
      const varName = setMatch[1];
      // Find latest variable in any Chrono step after this line
      const stepWithVar = traced.chrono.find((s) => s.line >= lineNum && s.variables[varName] !== undefined);
      if (stepWithVar) {
        const rawVal = stepWithVar.variables[varName];
        res.value = cleanStringDisplay(rawVal);
        res.type = inferType(rawVal);
      }
    }

    // Check outputs associated with this line
    const sayMatch = lineText.match(/^\s*(?:say|speak|print|console\.log)\b/);
    if (sayMatch) {
      // Find output from chrono steps
      const lineSteps = traced.chrono.filter((s) => s.line === lineNum);
      const outs: string[] = [];
      for (const st of lineSteps) {
        if (st.consoleOutputs && st.consoleOutputs.length > 0) {
          outs.push(st.consoleOutputs[st.consoleOutputs.length - 1]);
        }
      }
      if (outs.length === 0 && allOutputs.length > 0) {
        // Find matching output
        outs.push(...allOutputs);
      }
      if (outs.length > 0) {
        res.output = Array.from(new Set(outs));
      }
    }

    if (traced.errorLine === lineNum && traced.error) {
      res.error = traced.error;
    }

    return res;
  });

  // If studio tracer failed, check if fallback execute succeeds
  if (hasError && allOutputs.length === 0) {
    const rawExec = execute(code);
    if (rawExec.success) {
      hasError = false;
      allOutputs.push(...rawExec.output);
    }
  }

  // Ensure line outputs are populated from allOutputs if say was called
  lines.forEach((l) => {
    if (l.code.match(/^\s*(?:say|speak|print)\b/) && (!l.output || l.output.length === 0)) {
      l.output = allOutputs.length > 0 ? [...allOutputs] : undefined;
    }
  });

  return {
    lines,
    allOutputs,
    hasError,
    totalDurationMs: performance.now() - t0,
  };
}
