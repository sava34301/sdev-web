import { SdevFunction } from './utils';
import { SdevError } from '../core/errors';

export function registerJson(builtins: Map<string, SdevFunction>): void {
  builtins.set('etch', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('etch() takes 1 argument', line);
      return JSON.stringify(args[0]);
    },
  });

  builtins.set('unetch', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('unetch() takes 1 argument', line);
      try {
        return JSON.parse(args[0] as string);
      } catch {
        throw new SdevError('Invalid JSON', line);
      }
    },
  });
}
