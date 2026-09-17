import { stripBoardBlocks } from '../src/lang/hardware/strip';

let passed = 0;
let failed = 0;

function check(name: string, actual: string, expected: string) {
  if (actual === expected) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}\n       got:      ${JSON.stringify(actual)}\n       expected: ${JSON.stringify(expected)}`);
  }
}

console.log('stripBoardBlocks');

check('no blocks', stripBoardBlocks('let x = 1;\nsay x;'), 'let x = 1;\nsay x;');

const singleBlock = `let x = 1;
board "uno" {
  pin 13 be output
}
say x;`;
const singleExpected = `let x = 1;



say x;`;
check('one block', stripBoardBlocks(singleBlock), singleExpected);

const unclosedBlock = `board "uno" {
  pin 13 be output`;
check('invalid block (unclosed)', stripBoardBlocks(unclosedBlock), unclosedBlock);

const multipleBlocks = `board "uno" { }
let y = 2;
board "mega" {
  wait 100
}`;
const multipleExpected = `
let y = 2;


`;
check('multiple blocks', stripBoardBlocks(multipleBlocks), multipleExpected);

const blockWithQuotes = `board "uno" {
  use "Servo"
  serial print "hello {world}"
}`;
const blockWithQuotesExpected = `\n\n\n`;
check('block with string containing braces', stripBoardBlocks(blockWithQuotes), blockWithQuotesExpected);

const blockWithComments = `board "uno" {
  // this is a comment {
  pin 13 be output
}`;
const blockWithCommentsExpected = `\n\n\n`;
check('block with comments containing braces', stripBoardBlocks(blockWithComments), blockWithCommentsExpected);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
