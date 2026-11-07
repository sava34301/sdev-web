/**
 * Test Suite for Compiler Internals: Python/Kotlin/Rust Features in v2 Bytecode
 *
 * Verifies:
 * - AugAssignStatement (+=, -=, *=, etc.)
 * - AssertStatement
 * - PassStatement
 * - WalrusExpr (:=)
 * - SliceExpr ([start:stop])
 * - TupleLiteral and SetLiteral
 * - ComprehensionExpr (list and dict comprehensions)
 * - WithStatement
 */
import { Lexer } from '../src/lang/lexer';
import { Parser } from '../src/lang/parser';
import { Compiler } from '../src/lang/compiler';
import { VM } from '../src/lang/vm';

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name} ${detail}`);
    failed++;
  }
}

function runV2(source: string): { output: string[]; result: unknown } {
  const output: string[] = [];
  const lexer = new Lexer(source);
  const parser = new Parser(lexer.tokenize());
  const ast = parser.parse();
  const chunk = new Compiler().compile(ast);
  const vm = new VM((line) => output.push(line));
  const result = vm.run(chunk);
  return { output, result };
}

console.log('=== SDEV Compiler Internals Test Suite ===\n');

// 1. AugAssignStatement
{
  const r = runV2(`
forge x be 10
x += 5
x *= 2
x -= 4
speak(x)
`);
  check('AugAssignStatement (+=, *=, -=) in v2 bytecode', r.output[0] === '26', `got ${r.output[0]}`);
}

// 2. PassStatement
{
  const r = runV2(`
forge x be 1
either x equals 1 ::
  pass
;;
speak(x)
`);
  check('PassStatement executes cleanly as NOP in v2 bytecode', r.output[0] === '1');
}

// 3. WalrusExpr (:=)
{
  const r = runV2(`
either (n := 42) > 40 ::
  speak(n)
;;
`);
  check('WalrusExpr (:=) stores and returns value in v2 bytecode', r.output[0] === '42', `got ${r.output[0]}`);
}

// 4. SliceExpr ([start:stop])
{
  const r = runV2(`
forge xs be [10, 20, 30, 40, 50]
forge sub be xs[1:4]
speak(len(sub))
speak(sub[0])
speak(sub[2])
`);
  check('SliceExpr on list in v2 bytecode', r.output[0] === '3' && r.output[1] === '20' && r.output[2] === '40', JSON.stringify(r.output));
}

// 5. TupleLiteral & SetLiteral
{
  const r = runV2(`
forge t be (1, 2, 3)
forge s be {| 10, 20 |}
speak(len(t))
speak(len(s))
`);
  check('TupleLiteral and SetLiteral in v2 bytecode', r.output[0] === '3' && r.output[1] === '2', JSON.stringify(r.output));
}

// 6. AssertStatement
{
  const r = runV2(`
forge a be 10
assert a > 5, "a should be positive"
speak("assert passed")
`);
  check('AssertStatement succeeds when condition is true', r.output[0] === 'assert passed');
}

// 7. List Comprehension
{
  const r = runV2(`
forge nums be [1, 2, 3, 4, 5]
forge doubled be [x * 2 for x in nums if x > 2]
speak(len(doubled))
speak(doubled[0])
speak(doubled[1])
speak(doubled[2])
`);
  check('List comprehension in v2 bytecode', r.output[0] === '3' && r.output[1] === '6' && r.output[2] === '8' && r.output[3] === '10', JSON.stringify(r.output));
}

// 8. WithStatement
{
  const r = runV2(`
forge obj be { "val": 99 }
with obj as o ::
  speak(o.val)
;;
`);
  check('WithStatement binds alias and executes body', r.output[0] === '99', JSON.stringify(r.output));
}

// 9. Dict Comprehension
{
  const r = runV2(`
forge nums be [1, 2, 3]
forge d be { str(x): x * 10 for x in nums }
speak(d["1"])
speak(d["2"])
speak(d["3"])
`);
  check('Dict comprehension in v2 bytecode', r.output[0] === '10' && r.output[1] === '20' && r.output[2] === '30', JSON.stringify(r.output));
}

console.log(`\nCompiler Internals Suite: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
