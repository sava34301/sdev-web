/**
 * Thin bridge to `task_request` in `lang/agent/tasks.sdev`.
 */
import { sdevTaskRequest } from './sdev-engine';

export function taskRequest(
  stmt: string,
  known: Set<string> = new Set(),
  _quoted?: (t: string) => boolean,
): string[] | null {
  return sdevTaskRequest(stmt, known);
}
