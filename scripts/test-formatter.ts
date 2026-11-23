/**
 * Formal Formatter Test Suite (Roadmap Phase 5, Item 33)
 *
 * Verifies indentation, idempotency, comment/string safety, and whitespace
 * normalization in formatSdev.
 *
 * Run: node scripts/run-ts.mjs scripts/test-formatter.ts
 */
import { formatSdev } from '../src/lang/tools/formatter';

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

console.log('=== SDEV Formal Formatter Test Suite ===\n');

// 1. Basic indentation
const unindented = `conjure main() ::
speak("hello")
;;`;
const expectedIndented = `conjure main() ::
  speak("hello")
;;`;
check('Indents body of :: ;; block by 2 spaces', formatSdev(unindented, 2) === expectedIndented);

// 2. Configurable indent size
const expectedIndent4 = `conjure main() ::
    speak("hello")
;;`;
check('Configurable indent size (4 spaces)', formatSdev(unindented, 4) === expectedIndent4);

// 3. Multi-level nesting
const nestedCode = `conjure outer() ::
cycle count < 10 ::
ponder count is 5 ::
speak("five")
;;
;;
;;`;
const expectedNested = `conjure outer() ::
  cycle count < 10 ::
    ponder count is 5 ::
      speak("five")
    ;;
  ;;
;;`;
check('Multi-level nested block indentation', formatSdev(nestedCode, 2) === expectedNested);

// 4. Idempotence: format(format(code)) === format(code)
const formattedOnce = formatSdev(nestedCode, 2);
const formattedTwice = formatSdev(formattedOnce, 2);
check('Idempotence: formatting twice produces identical output', formattedOnce === formattedTwice);

// 5. String safety: :: inside strings are not counted as block openers
const stringCode = `speak("here is a colon :: in text")
speak("here is double semi ;; in text")`;
check('Leaves strings containing :: and ;; intact', formatSdev(stringCode, 2) === stringCode);

// 6. Comment safety: :: inside comments are not counted
const commentCode = `// comment with :: opener
speak("test")`;
const formattedComment = formatSdev(commentCode, 2);
check('Ignores :: inside single-line comments', !formattedComment.startsWith('  speak'));

// 7. Trailing whitespace stripping
const trailingWs = `speak("hello")     \nspeak("world")  `;
const expectedNoWs = `speak("hello")\nspeak("world")`;
check('Strips trailing whitespace from lines', formatSdev(trailingWs, 2) === expectedNoWs);

// 8. Blank line normalization: collapses 3+ blank lines into 2
const excessiveBlanks = `speak("a")\n\n\n\n\nspeak("b")`;
const expectedBlanks = `speak("a")\n\nspeak("b")`;
check('Normalizes excessive blank lines', formatSdev(excessiveBlanks, 2) === expectedBlanks);

console.log(`\nFormatter suite: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
