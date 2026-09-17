import { SdevFunction, OutputCallback, stringify, isTruthy, toNumber } from './utils';
import { SdevError } from '../errors';

export function registerTypes(builtins: Map<string, SdevFunction>, output: OutputCallback): void {

  // ============= Type Checking =============
  builtins.set('isNum', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isNum() takes 1 argument', line);
      return typeof args[0] === 'number';
    },
  });

  builtins.set('isText', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isText() takes 1 argument', line);
      return typeof args[0] === 'string';
    },
  });

  builtins.set('isList', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isList() takes 1 argument', line);
      return Array.isArray(args[0]);
    },
  });

  builtins.set('isTome', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isTome() takes 1 argument', line);
      return args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0]);
    },
  });

  builtins.set('isTruth', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isTruth() takes 1 argument', line);
      return typeof args[0] === 'boolean';
    },
  });

  builtins.set('isVoid', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isVoid() takes 1 argument', line);
      return args[0] === null;
    },
  });

  builtins.set('isFunc', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isFunc() takes 1 argument', line);
      const val = args[0];
      if (val && typeof val === 'object' && 'type' in val) {
        const t = (val as { type: string }).type;
        return t === 'builtin' || t === 'user' || t === 'lambda';
      }
      return false;
    },
  });
}
