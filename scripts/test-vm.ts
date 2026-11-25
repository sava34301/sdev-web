import assert from 'node:assert/strict';
import { Lexer } from '../src/lang/core/lexer';
import { Parser } from '../src/lang/core/parser';
import { Compiler } from '../src/lang/runtime/compiler';
import { VM } from '../src/lang/runtime/vm';
import { SdevError } from '../src/lang/core/errors';
import { OpCode, type Chunk } from '../src/lang/runtime/bytecode';

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.error(`  FAIL ${name}: ${(e as Error).message}`);
  }
}

function runVmSource(source: string): string[] {
  const out: string[] = [];
  const tokens = new Lexer(source).tokenize();
  const ast = new Parser(tokens).parse();
  const chunk = new Compiler().compile(ast);
  new VM((line) => out.push(line)).run(chunk);
  return out;
}

console.log('=== SDEV Bytecode VM Test Suite ===');

check('VM executes function call and returns value via ReturnException', () => {
  const out = runVmSource(`
conjure doubleAndAdd(x, y) ::
  yield x * 2 + y
;;
speak(doubleAndAdd(20, 2))
speak("after_call")
`);
  assert.deepEqual(out, ['42', 'after_call']);
});

check('VM restores stack and frames across nested function returns', () => {
  const out = runVmSource(`
conjure addTen(n) ::
  yield n + 10
;;
conjure combine(a, b) ::
  forge x be addTen(a)
  forge y be addTen(b)
  yield x * y
;;
speak(combine(2, 5))
`);
  assert.deepEqual(out, ['180']);
});

check('VM propagates SdevError on invalid opcode and remains reusable', () => {
  const vm = new VM(() => {});
  const badChunk: Chunk = {
    version: 1,
    entry: {
      name: '<main>',
      params: [],
      code: [{ op: 9999 as OpCode, line: 1 }],
      functions: [],
    },
  };
  assert.throws(() => vm.run(badChunk), SdevError);

  const goodTokens = new Lexer('speak("recovered")').tokenize();
  const goodChunk = new Compiler().compile(new Parser(goodTokens).parse());
  const out: string[] = [];
  const vm2 = new VM((line) => out.push(line));
  vm2.run(goodChunk);
  assert.deepEqual(out, ['recovered']);
});

console.log(`\nVM Suite: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
