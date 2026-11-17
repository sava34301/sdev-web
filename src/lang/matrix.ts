import { SdevError } from './errors';
import { SdevFunction } from './builtins';
import { createSdevModuleRunner, type SdevModuleRunner } from './sdev-module';
import SDEV_MATRIX_SRC from '../../lang/stdlib/v2/matrix.sdev?raw';

type Matrix = number[][];

let runner: SdevModuleRunner | null = null;
function getMatrixRunner(): SdevModuleRunner {
  if (!runner) runner = createSdevModuleRunner(SDEV_MATRIX_SRC);
  return runner;
}

export function createMatrixBuiltins(): Map<string, SdevFunction> {
  const builtins = new Map<string, SdevFunction>();

  builtins.set('matrix', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('matrix() takes at least 2 arguments (rows, cols, fill?)', line);
      const rows = args[0] as number;
      const cols = args[1] as number;
      const fill = (args[2] as number) ?? 0;
      return getMatrixRunner().call('mat2d_create', rows, cols, fill);
    },
  });

  builtins.set('identity', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('identity() takes 1 argument (size)', line);
      return getMatrixRunner().call('mat2d_identity', args[0] as number);
    },
  });

  builtins.set('transpose', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('transpose() takes 1 argument', line);
      const m = args[0];
      if (!Array.isArray(m)) throw new SdevError('Argument must be a 2D list', line);
      return getMatrixRunner().call('mat2d_transpose', m);
    },
  });

  builtins.set('dot', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('dot() takes 2 arguments', line);
      const a = args[0] as number[];
      const b = args[1] as number[];
      if (!Array.isArray(a) || !Array.isArray(b)) {
        throw new SdevError('Arguments must be lists', line);
      }
      if (a.length !== b.length) throw new SdevError('Vectors must have same length', line);
      return getMatrixRunner().call('mat2d_dot', a, b);
    },
  });

  builtins.set('matmul', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('matmul() takes 2 arguments', line);
      const a = args[0] as Matrix;
      const b = args[1] as Matrix;
      if (!Array.isArray(a) || !Array.isArray(b)) {
        throw new SdevError('Arguments must be 2D lists', line);
      }
      if ((a[0] as number[]).length !== b.length) {
        throw new SdevError('Matrix dimensions incompatible for multiplication', line);
      }
      return getMatrixRunner().call('mat2d_mul', a, b);
    },
  });

  builtins.set('matadd', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('matadd() takes 2 arguments', line);
      assertSameDims(args[0] as Matrix, args[1] as Matrix, line);
      return getMatrixRunner().call('mat2d_add', args[0], args[1]);
    },
  });

  builtins.set('matsub', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('matsub() takes 2 arguments', line);
      assertSameDims(args[0] as Matrix, args[1] as Matrix, line);
      return getMatrixRunner().call('mat2d_sub', args[0], args[1]);
    },
  });

  builtins.set('matscale', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('matscale() takes 2 arguments (matrix, scalar)', line);
      return getMatrixRunner().call('mat2d_scale', args[0], args[1]);
    },
  });

  builtins.set('shape', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('shape() takes 1 argument', line);
      const m = args[0];
      if (!Array.isArray(m) || m.length === 0) return [0];
      if (!Array.isArray(m[0])) return [m.length];
      return [m.length, (m[0] as unknown[]).length];
    },
  });

  builtins.set('flatten', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('flatten() takes 1 argument', line);
      const m = args[0];
      return Array.isArray(m) ? (m as unknown[]).flat(Infinity) : [m];
    },
  });

  builtins.set('reshape', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('reshape() takes 3 arguments (list, rows, cols)', line);
      const arr = args[0] as unknown[];
      const rows = args[1] as number;
      const cols = args[2] as number;
      if (!Array.isArray(arr)) throw new SdevError('First argument must be a list', line);
      const flat = arr.flat(Infinity) as number[];
      if (flat.length !== rows * cols) {
        throw new SdevError('Cannot reshape: size mismatch', line);
      }
      return getMatrixRunner().call('mat2d_reshape', flat, rows, cols);
    },
  });

  builtins.set('matsum', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('matsum() takes 1 argument', line);
      const m = args[0];
      if (!Array.isArray(m)) return m;
      if (m.length > 0 && Array.isArray(m[0])) {
        return getMatrixRunner().call('mat2d_sum', m);
      }
      return getMatrixRunner().call('mat2d_sum', [m]);
    },
  });

  builtins.set('matmean', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('matmean() takes 1 argument', line);
      const m = args[0];
      if (!Array.isArray(m)) return m;
      const flat = (m as unknown[]).flat(Infinity) as number[];
      if (flat.length === 0) return 0;
      const s = Number(getMatrixRunner().call('mat2d_sum', Array.isArray(m[0]) ? m : [m]));
      return s / flat.length;
    },
  });

  return builtins;
}

function assertSameDims(a: Matrix, b: Matrix, line: number): void {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    throw new SdevError('Arguments must be 2D lists', line);
  }
  if (a.length !== b.length || (a[0] as number[]).length !== (b[0] as number[]).length) {
    throw new SdevError('Matrices must have same dimensions', line);
  }
}
