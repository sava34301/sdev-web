/**
 * Test Suite for Local Model Server (LM Studio, Ollama, llama.cpp, LocalAI)
 * Normalization, Parsing, and Probing.
 *
 * Run: node scripts/run-ts.mjs scripts/test-local-brain.ts
 */
import {
  normalizeLocalEndpoints,
  parseReply,
  probeLocalServer,
} from '../src/lang/agent/brain';

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

console.log('=== Local Model Server Integration Test Suite ===\n');

// 1. LM Studio endpoint normalization
console.log('--- 1. LM Studio URL Normalization ---');
const lm1 = normalizeLocalEndpoints('http://localhost:1234');
check('LM Studio base URL without trailing slash',
  lm1.baseUrl === 'http://localhost:1234' &&
  lm1.chatUrl === 'http://localhost:1234/v1/chat/completions' &&
  lm1.modelsUrl === 'http://localhost:1234/v1/models',
  JSON.stringify(lm1)
);

const lm2 = normalizeLocalEndpoints('http://localhost:1234/v1');
check('LM Studio URL with /v1 does not duplicate /v1/v1',
  lm2.baseUrl === 'http://localhost:1234' &&
  lm2.chatUrl === 'http://localhost:1234/v1/chat/completions' &&
  lm2.modelsUrl === 'http://localhost:1234/v1/models',
  JSON.stringify(lm2)
);

const lm3 = normalizeLocalEndpoints('localhost:1234/');
check('LM Studio URL without http:// prefix',
  lm3.baseUrl === 'http://localhost:1234' &&
  lm3.chatUrl === 'http://localhost:1234/v1/chat/completions',
  JSON.stringify(lm3)
);

// 2. Ollama endpoint normalization
console.log('\n--- 2. Ollama URL Normalization ---');
const ol1 = normalizeLocalEndpoints('http://127.0.0.1:11434');
check('Ollama standard base URL',
  ol1.baseUrl === 'http://127.0.0.1:11434' &&
  ol1.chatUrl === 'http://127.0.0.1:11434/v1/chat/completions' &&
  ol1.tagsUrl === 'http://127.0.0.1:11434/api/tags',
  JSON.stringify(ol1)
);

const ol2 = normalizeLocalEndpoints('http://localhost:11434/api/chat');
check('Ollama native /api/chat path recognition',
  ol2.baseUrl === 'http://localhost:11434' &&
  ol2.chatUrl === 'http://localhost:11434/api/chat' &&
  ol2.isOllamaNative === true,
  JSON.stringify(ol2)
);

// 3. llama.cpp / LocalAI endpoint normalization
console.log('\n--- 3. llama.cpp / LocalAI Normalization ---');
const ll1 = normalizeLocalEndpoints('http://localhost:8080/v1/chat/completions');
check('llama.cpp full completions path',
  ll1.baseUrl === 'http://localhost:8080' &&
  ll1.chatUrl === 'http://localhost:8080/v1/chat/completions' &&
  ll1.modelsUrl === 'http://localhost:8080/v1/models',
  JSON.stringify(ll1)
);

// 4. Brain Reply Parsing
console.log('\n--- 4. Brain Reply Parsing ---');
const p1 = parseReply('{"canonical": "say 42", "notes": "returns 42"}');
check('Parse valid JSON object', p1?.canonical === 'say 42' && p1?.notes === 'returns 42');

const p2 = parseReply('```json\n{"canonical": "set x to 10\\nsay x", "notes": "prints 10"}\n```');
check('Parse markdown code fenced JSON', p2?.canonical === 'set x to 10\nsay x');

const p3 = parseReply('```sdev\nsay "hello world"\n```');
check('Parse bare code in markdown fence', p3?.canonical === 'say "hello world"');

const p4 = parseReply('say 99');
check('Parse raw text code', p4?.canonical === 'say 99');

// 5. Server probing diagnostics & hints
console.log('\n--- 5. Server Probing Diagnostics ---');
const origFetch = globalThis.fetch;
globalThis.fetch = (async () => {
  throw new TypeError('fetch failed');
}) as typeof fetch;
try {
  const probe1234 = await probeLocalServer('http://127.0.0.1:1234');
  check('LM Studio hint provided when connection is refused/CORS',
    !probe1234.ok && Boolean(probe1234.hint?.includes('LM Studio')),
    JSON.stringify(probe1234)
  );

  const probe11434 = await probeLocalServer('http://127.0.0.1:11434');
  check('Ollama hint provided when connection is refused/CORS',
    !probe11434.ok && Boolean(probe11434.hint?.includes('Ollama')),
    JSON.stringify(probe11434)
  );
} finally {
  globalThis.fetch = origFetch;
}

console.log(`\n================================================================`);
console.log(`Local Model Suite: ${passed} passed, ${failed} failed`);
console.log(`================================================================\n`);

if (failed > 0) process.exit(1);
