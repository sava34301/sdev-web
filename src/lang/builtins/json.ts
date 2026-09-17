import { SdevFunction, OutputCallback, stringify, isTruthy, toNumber } from './utils';
import { SdevError } from '../errors';

export function registerJson(builtins: Map<string, SdevFunction>, output: OutputCallback): void {

  // JSON
  builtins.set('etch', { type: 'builtin', call: (args: unknown[]) => JSON.stringify(args[0]) });
  builtins.set('unetch', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      try { return JSON.parse(args[0] as string); }
      catch { throw new SdevError('Invalid JSON', line); }
    },
  });
}
