import { SdevFunction, OutputCallback, stringify, isTruthy, toNumber } from './utils';
import { SdevError } from '../errors';

export function registerTime(builtins: Map<string, SdevFunction>, output: OutputCallback): void {

  // ============= Time =============
  builtins.set('now', {
    type: 'builtin',
    call: () => Date.now(),
  });

  builtins.set('timestamp', {
    type: 'builtin',
    call: () => new Date().toISOString(),
  });

  // ============= Time Formatting =============

  // time() - current time as tome
  builtins.set('time', {
    type: 'builtin',
    call: () => {
      const d = new Date();
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        hour: d.getHours(),
        minute: d.getMinutes(),
        second: d.getSeconds(),
        ms: d.getMilliseconds(),
        timestamp: d.getTime(),
        iso: d.toISOString(),
      };
    },
  });

  // formatTime(ms, format?) - format milliseconds
  builtins.set('formatTime', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('formatTime() takes at least 1 argument', line);
      if (typeof args[0] !== 'number') throw new SdevError('First argument must be a number (ms)', line);
      const d = new Date(args[0]);
      return d.toISOString();
    },
  });
}
