import { extractBoardBlock } from '../src/lang/hardware/transpile';

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}\n       got:      ${a}\n       expected: ${e}`);
  }
}

console.log('Testing extractBoardBlock');

// Basic case
check(
  'Basic board block',
  extractBoardBlock('board "uno" { \n  use "Servo"\n}'),
  {
    boardId: 'uno',
    body: ' \n  use "Servo"\n',
    startIndex: 0,
    endIndex: 30
  }
);

// Nested braces
check(
  'Nested braces',
  extractBoardBlock('board "uno" { if (true) { } }'),
  {
    boardId: 'uno',
    body: ' if (true) { } ',
    startIndex: 0,
    endIndex: 29
  }
);

// Braces inside strings
check(
  'Braces inside string',
  extractBoardBlock('board "uno" { say "{" }'),
  {
    boardId: 'uno',
    body: ' say "{" ',
    startIndex: 0,
    endIndex: 23
  }
);

// Escaped quotes inside strings
check(
  'Escaped quotes',
  extractBoardBlock('board "uno" { say "\\"{}" }'),
  {
    boardId: 'uno',
    body: ' say "\\"{}" ',
    startIndex: 0,
    endIndex: 26
  }
);

// Braces inside comments
check(
  'Braces inside comments',
  extractBoardBlock('board "uno" { // }\n }'),
  {
    boardId: 'uno',
    body: ' // }\n ',
    startIndex: 0,
    endIndex: 21
  }
);

// No valid block
check(
  'No block',
  extractBoardBlock('just some regular code { }'),
  null
);

// Unbalanced block (missing closing brace)
check(
  'Unbalanced block',
  extractBoardBlock('board "uno" { code'),
  null
);

// Whitespace variations
check(
  'Whitespace variations',
  extractBoardBlock('  board   "uno"   { code }  '),
  {
    boardId: 'uno',
    body: ' code ',
    startIndex: 2,
    endIndex: 26
  }
);

// Multiple blocks (should only extract first)
check(
  'Multiple blocks',
  extractBoardBlock('board "uno" { one } board "mega" { two }'),
  {
    boardId: 'uno',
    body: ' one ',
    startIndex: 0,
    endIndex: 19
  }
);

// Prefix code before block
check(
  'Prefix code',
  extractBoardBlock('say "hello"\nboard "uno" { code }'),
  {
    boardId: 'uno',
    body: ' code ',
    startIndex: 12,
    endIndex: 32
  }
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
