/**
 * Thin bridge to `math_request` in `lang/agent/math.sdev`.
 */
import { sdevMathRequest } from './sdev-engine';

export function mathRequest(stmt: string, known: Set<string> = new Set()): string | null {
  return sdevMathRequest(stmt, known);
}
