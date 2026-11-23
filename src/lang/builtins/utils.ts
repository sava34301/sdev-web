import { SdevError } from '../core/errors';

export type OutputCallback = (message: string) => void;

export interface SdevFunction {
  type: 'builtin' | 'user' | 'lambda';
  call: (args: unknown[], line: number) => unknown;
}

export const SDEV_TEXT_HOOK = Symbol.for('sdev.textHook');
export const SDEV_REPR_HOOK = Symbol.for('sdev.reprHook');

export function stringify(value: unknown): string {
  if (value === null) return 'void';
  if (typeof value === 'boolean') return value ? 'yep' : 'nope';
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && (value as { __error__?: boolean }).__error__) {
    return String((value as { message?: unknown }).message ?? '');
  }
  if (value && typeof value === 'object') {
    const hook = (value as Record<symbol, (() => string | undefined) | undefined>)[SDEV_TEXT_HOOK];
    if (hook) {
      const custom = hook();
      if (custom !== undefined) return custom;
    }
    const directOnText = (value as Record<string, unknown>).on_text;
    if (directOnText && typeof (directOnText as SdevFunction).call === 'function') {
      return stringify((directOnText as SdevFunction).call([], 0));
    }
  }
  if (typeof value === 'number') {
    if (value === Infinity) return 'inf';
    if (value === -Infinity) return '-inf';
    return String(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stringify).join(', ') + ']';
  }
  if (typeof value === 'object') {
    if ((value as { type?: string }).type === 'builtin' ||
        (value as { type?: string }).type === 'user' ||
        (value as { type?: string }).type === 'lambda' ||
        (value as { type?: string }).type === 'class') {
      return '<conjuration>';
    }
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([k]) => !['add','sub','mul','mag','normalize','dot','distance',
                          'enqueue','dequeue','push','pop','peek','size','isEmpty',
                          'clear','values','keys','entries','get','set','has','delete',
                          'remove','append','prepend','toList','_data'].includes(k))
      .map(([k, v]) => `${k}: ${stringify(v)}`)
      .join(', ');
    return ':: ' + entries + ' ;;';
  }
  return String(value);
}

export function isTruthy(value: unknown): boolean {
  if (value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function toNumber(value: unknown, line: number): number {
  if (typeof value === 'number') return value;
  throw new SdevError(`Expected number, got ${typeof value}`, line);
}
