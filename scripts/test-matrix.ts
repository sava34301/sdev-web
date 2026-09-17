import { createMatrixBuiltins } from '../src/lang/matrix';

const builtins = createMatrixBuiltins();
let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`✗ ${name}`);
    console.error(e.message || e);
    failed++;
  }
}

function expectThrow(name: string, errorSubstr: string, fn: () => void) {
  try {
    fn();
    console.log(`✗ ${name} (expected to throw)`);
    failed++;
  } catch (e: any) {
    if (e.message && e.message.includes(errorSubstr)) {
      console.log(`✓ ${name} (threw expected error)`);
      passed++;
    } else {
      console.log(`✗ ${name} (threw unexpected error: ${e.message || e})`);
      failed++;
    }
  }
}

function assertDeepEqual(actual: any, expected: any) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log('--- Testing matrix builtins ---');

// matrix
const matrixFunc = builtins.get('matrix')!;
check('matrix: basic 2x3', () => {
  assertDeepEqual(matrixFunc.call([2, 3], 1), [[0, 0, 0], [0, 0, 0]]);
});
check('matrix: with fill', () => {
  assertDeepEqual(matrixFunc.call([2, 2, 5], 1), [[5, 5], [5, 5]]);
});
expectThrow('matrix: < 2 args', 'matrix() takes at least 2 arguments', () => matrixFunc.call([2], 1));

// identity
const identityFunc = builtins.get('identity')!;
check('identity: 3x3', () => {
  assertDeepEqual(identityFunc.call([3], 1), [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
});
expectThrow('identity: != 1 arg', 'identity() takes 1 argument', () => identityFunc.call([3, 3], 1));

// transpose
const transposeFunc = builtins.get('transpose')!;
check('transpose: basic', () => {
  assertDeepEqual(transposeFunc.call([[[1, 2], [3, 4]]], 1), [[1, 3], [2, 4]]);
});
check('transpose: empty matrix', () => {
  assertDeepEqual(transposeFunc.call([[]], 1), []);
});
expectThrow('transpose: non-array', 'Argument must be a 2D list', () => transposeFunc.call([5], 1));
expectThrow('transpose: != 1 arg', 'transpose() takes 1 argument', () => transposeFunc.call([], 1));

// dot
const dotFunc = builtins.get('dot')!;
check('dot: basic', () => {
  assertDeepEqual(dotFunc.call([[1, 2], [3, 4]], 1), 11);
});
expectThrow('dot: != 2 args', 'dot() takes 2 arguments', () => dotFunc.call([[1, 2]], 1));
expectThrow('dot: non-arrays', 'Arguments must be lists', () => dotFunc.call([[1, 2], 5], 1));
expectThrow('dot: mismatched lengths', 'Vectors must have same length', () => dotFunc.call([[1, 2], [3, 4, 5]], 1));

// matmul
const matmulFunc = builtins.get('matmul')!;
check('matmul: 2x2 and 2x2', () => {
  assertDeepEqual(matmulFunc.call([[[1, 2], [3, 4]], [[5, 6], [7, 8]]], 1), [[19, 22], [43, 50]]);
});
expectThrow('matmul: != 2 args', 'matmul() takes 2 arguments', () => matmulFunc.call([[[1, 2]]], 1));
expectThrow('matmul: non-arrays', 'Arguments must be 2D lists', () => matmulFunc.call([[[1, 2]], 5], 1));
expectThrow('matmul: incompatible dimensions', 'incompatible for multiplication', () => matmulFunc.call([[[1, 2]], [[1, 2]]], 1));

// matadd
const mataddFunc = builtins.get('matadd')!;
check('matadd: basic', () => {
  assertDeepEqual(mataddFunc.call([[[1, 2]], [[3, 4]]], 1), [[4, 6]]);
});
expectThrow('matadd: != 2 args', 'matadd() takes 2 arguments', () => mataddFunc.call([[[1, 2]]], 1));
expectThrow('matadd: mismatched dims', 'Matrices must have same dimensions', () => mataddFunc.call([[[1, 2]], [[1, 2], [3, 4]]], 1));

// matsub
const matsubFunc = builtins.get('matsub')!;
check('matsub: basic', () => {
  assertDeepEqual(matsubFunc.call([[[5, 5]], [[3, 2]]], 1), [[2, 3]]);
});
expectThrow('matsub: != 2 args', 'matsub() takes 2 arguments', () => matsubFunc.call([[[1, 2]]], 1));

// matscale
const matscaleFunc = builtins.get('matscale')!;
check('matscale: basic', () => {
  assertDeepEqual(matscaleFunc.call([[[1, 2], [3, 4]], 2], 1), [[2, 4], [6, 8]]);
});
expectThrow('matscale: != 2 args', 'matscale() takes 2 arguments', () => matscaleFunc.call([[[1, 2]]], 1));

// shape
const shapeFunc = builtins.get('shape')!;
check('shape: 2D array', () => {
  assertDeepEqual(shapeFunc.call([[[1, 2], [3, 4]]], 1), [2, 2]);
});
check('shape: 1D array', () => {
  assertDeepEqual(shapeFunc.call([[1, 2, 3]], 1), [3]);
});
check('shape: empty array', () => {
  assertDeepEqual(shapeFunc.call([[]], 1), [0]);
});
check('shape: non-array', () => {
  assertDeepEqual(shapeFunc.call([5], 1), [0]);
});
expectThrow('shape: != 1 arg', 'shape() takes 1 argument', () => shapeFunc.call([], 1));

// flatten
const flattenFunc = builtins.get('flatten')!;
check('flatten: nested arrays', () => {
  assertDeepEqual(flattenFunc.call([[[1, 2], [3, [4, 5]]]], 1), [1, 2, 3, 4, 5]);
});
check('flatten: non-array', () => {
  assertDeepEqual(flattenFunc.call([5], 1), [5]);
});
expectThrow('flatten: != 1 arg', 'flatten() takes 1 argument', () => flattenFunc.call([], 1));

// reshape
const reshapeFunc = builtins.get('reshape')!;
check('reshape: basic', () => {
  assertDeepEqual(reshapeFunc.call([[1, 2, 3, 4], 2, 2], 1), [[1, 2], [3, 4]]);
});
expectThrow('reshape: != 3 args', 'reshape() takes 3 arguments', () => reshapeFunc.call([[1, 2, 3, 4], 2], 1));
expectThrow('reshape: non-list', 'First argument must be a list', () => reshapeFunc.call([5, 2, 2], 1));
expectThrow('reshape: size mismatch', 'Cannot reshape: size mismatch', () => reshapeFunc.call([[1, 2, 3], 2, 2], 1));

// matsum
const matsumFunc = builtins.get('matsum')!;
check('matsum: basic', () => {
  assertDeepEqual(matsumFunc.call([[[1, 2], [3, 4]]], 1), 10);
});
check('matsum: non-array', () => {
  assertDeepEqual(matsumFunc.call([5], 1), 5);
});
expectThrow('matsum: != 1 arg', 'matsum() takes 1 argument', () => matsumFunc.call([], 1));

// matmean
const matmeanFunc = builtins.get('matmean')!;
check('matmean: basic', () => {
  assertDeepEqual(matmeanFunc.call([[[1, 2], [3, 4]]], 1), 2.5);
});
check('matmean: empty', () => {
  assertDeepEqual(matmeanFunc.call([[]], 1), 0);
});
check('matmean: non-array', () => {
  assertDeepEqual(matmeanFunc.call([5], 1), 5);
});
expectThrow('matmean: != 1 arg', 'matmean() takes 1 argument', () => matmeanFunc.call([], 1));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
