import assert from 'node:assert';
import { sanitizeBrainOutput, parseReply } from '../src/lang/agent/brain';
import { isAiDialect, aiToSdev } from '../src/lang/agent/sdev-engine';
import { parses } from '../src/lang/agent/sense';

console.log('=== Brain Sanitizer & Parser Robustness Tests ===');

// 1. Missing !#ai header restoration
{
  const aiCode = `
v x = 10
p(x)
`;
  const sanitized = sanitizeBrainOutput(aiCode);
  assert(sanitized.startsWith('!#ai\n'), 'Prepends !#ai when AI dialect tokens are present');
  assert(isAiDialect(sanitized), 'isAiDialect recognizes sanitized AI code');
  const canonical = aiToSdev(sanitized);
  console.log('aiToSdev output:', JSON.stringify(canonical));
  assert(canonical.length > 0, 'aiToSdev returns output');
  console.log('  ok   Restores missing !#ai header for AI dialect tokens');
}

// 2. Python print(...) -> say ...
{
  const pythonCode = `print("hello world")`;
  const sanitized = sanitizeBrainOutput(pythonCode);
  assert(sanitized === 'say "hello world"', `Expected 'say "hello world"', got '${sanitized}'`);
  assert(parses(sanitized), 'Sanitized print parses as canonical sdev');
  console.log('  ok   Converts print(...) to say ...');
}

// 3. Python def foo(a, b): -> to foo with a b ... end
{
  const pythonFn = `
def add(a, b):
  return a + b
`;
  const sanitized = sanitizeBrainOutput(pythonFn);
  assert(sanitized.includes('to add with a b'), 'Converts def to to NAME with ARGS');
  assert(sanitized.includes('end'), 'Auto-closes function with end');
  assert(parses(sanitized), 'Sanitized function parses');
  console.log('  ok   Converts def foo(a, b): and auto-closes with end');
}

// 4. Python for i in range(1, 11): -> for each i in sequence(1, 11)
{
  const rangeLoop = `
for i in range(1, 11):
  print(i)
`;
  const sanitized = sanitizeBrainOutput(rangeLoop);
  assert(sanitized.includes('for each i in sequence(1, 11)'), 'Converts range to sequence');
  assert(sanitized.includes('say i'), 'Converts print(i) to say i');
  assert(sanitized.includes('end'), 'Auto-closes loop with end');
  assert(parses(sanitized), 'Sanitized loop parses');
  console.log('  ok   Converts for i in range(...) loop to for each i in sequence(...)');
}

// 5. Conversational preamble stripping and JSON extraction
{
  const modelOutputWithProse = `
Here is the canonical SDEV code you requested:
\`\`\`json
{
  "canonical": "set name to \\"Sam\\"\\nsay name",
  "notes": "Created name variable"
}
\`\`\`
Hope that helps! Let me know if you need any adjustments.
`;
  const reply = parseReply(modelOutputWithProse);
  assert(reply !== null, 'parseReply extracts JSON from conversational prose');
  assert(reply.canonical.includes('set name to "Sam"'), 'Extracted canonical code intact');
  assert(parses(reply.canonical), 'Extracted canonical code parses cleanly');
  console.log('  ok   Extracts JSON and cleans prose preambles/postambles');
}

// 6. Embedded raw JSON object without fences
{
  const embeddedJson = `
Sure! Here is the JSON object:
{"canonical": "say 23 - 21", "notes": "math expression"}
Enjoy!
`;
  const reply = parseReply(embeddedJson);
  assert(reply !== null && reply.canonical === 'say 23 - 21', 'Extracts bare JSON substring');
  console.log('  ok   Extracts bare JSON object embedded in text');
}

console.log('\nAll Brain Sanitizer tests passed!\n');
