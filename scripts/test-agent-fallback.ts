/**
 * Tests for understander re-understanding (`fresh: true`), micro-brain gating,
 * and automatic fallback from local/WebLLM to the website AI (`sdev-agent`).
 *
 * Run with: node scripts/run-ts.mjs scripts/test-agent-fallback.ts
 */
import assert from 'node:assert';
import {
  understandAsync,
  reconsider,
  setMemoryStore,
  emptyMemory,
  type AgentMemory,
} from '../src/lang/agent';
import { BRAIN_KEYS } from '../src/lang/agent/brain';
import { callMicroBrain } from '../src/lang/agent/micro-brain';

let memory: AgentMemory = emptyMemory();
setMemoryStore({ load: () => memory, save: (m) => { memory = m; } });

let localCalls = 0;
let onlineCalls = 0;
let localReply = '';
let onlineReply = '';

const LOCAL_URL = 'http://127.0.0.1:19999/v1/chat/completions';

localStorage.setItem(BRAIN_KEYS.url, LOCAL_URL);
localStorage.setItem(BRAIN_KEYS.online, '1');
localStorage.setItem(BRAIN_KEYS.browser, '0');

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url.startsWith('http://127.0.0.1:19999')) {
    localCalls++;
    return new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify({ canonical: localReply }) } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
  if (url.includes('/functions/v1/sdev-agent')) {
    onlineCalls++;
    return new Response(
      JSON.stringify({ canonical: onlineReply, notes: 'online fallback' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
  throw new Error(`Unexpected fetch in test: ${url}`);
}) as typeof fetch;

function resetCounts() {
  localCalls = 0;
  onlineCalls = 0;
}

// 1. Local returns unparseable output -> falls back to website AI
{
  memory = emptyMemory();
  resetCounts();
  localReply = 'not valid sdev (((';
  onlineReply = 'say "cosmic ok"';
  const res = await understandAsync('perform the cosmic ritual now');
  assert.strictEqual(res.brainUsed, 'online', 'unparseable local reply escalates to online');
  assert.strictEqual(res.source, 'say "cosmic ok"');
  assert(localCalls >= 1, 'local brain tried first');
  assert(onlineCalls >= 1, 'online brain consulted after local failed');
  console.log('  ok   unparseable local reply escalates to website AI');
}

// 2. Local returns code with unknown names -> falls back to website AI
{
  memory = emptyMemory();
  resetCounts();
  localReply = 'frobnicate(widget_alpha)';
  onlineReply = 'say "widgets ok"';
  const res = await understandAsync('frobnicate widget alpha please');
  assert.strictEqual(res.brainUsed, 'online', 'unknown-name local reply escalates to online');
  assert.strictEqual(res.source, 'say "widgets ok"');
  assert(localCalls >= 1, 'local brain tried first');
  assert(onlineCalls >= 1, 'online brain consulted when local left unknown names');
  console.log('  ok   unknown-name local reply escalates to website AI');
}

// 3. Local succeeds cleanly -> website AI is NOT called
{
  memory = emptyMemory();
  resetCounts();
  localReply = 'say "local ok"';
  onlineReply = 'say "should not be used"';
  const res = await understandAsync('do the local ok procedure');
  assert.strictEqual(res.brainUsed, 'local');
  assert.strictEqual(res.source, 'say "local ok"');
  assert(localCalls === 1, 'local brain succeeded in one call');
  assert.strictEqual(onlineCalls, 0, 'online brain is NOT called when local succeeds');
  console.log('  ok   valid local reply does not use website AI');
}

// 4. fresh: true bypasses and refreshes cached result
{
  memory = emptyMemory();
  resetCounts();
  const src = 'compute special greeting now';
  localReply = 'say "first"';
  const r1 = await understandAsync(src);
  assert.strictEqual(r1.source, 'say "first"');
  assert.strictEqual(localCalls, 1);

  resetCounts();
  const r2 = await understandAsync(src);
  assert.strictEqual(r2.cached, true, 'second run uses cached result');
  assert.strictEqual(r2.source, 'say "first"');
  assert.strictEqual(localCalls, 0);

  resetCounts();
  localReply = 'say "refreshed"';
  const r3 = await understandAsync(src, { fresh: true });
  assert.strictEqual(Boolean(r3.cached), false, 'fresh: true bypasses cache');
  assert.strictEqual(r3.source, 'say "refreshed"');
  assert.strictEqual(localCalls, 1);

  resetCounts();
  const r4 = await understandAsync(src);
  assert.strictEqual(r4.cached, true, 'next run sees updated cache');
  assert.strictEqual(r4.source, 'say "refreshed"');
  assert.strictEqual(localCalls, 0);
  console.log('  ok   fresh: true bypasses and refreshes cached result');
}

// 5. reconsider escalates directly to website AI when local code failed at runtime
{
  memory = emptyMemory();
  resetCounts();
  const src = 'evaluate broken division step';
  localReply = 'say 1 / 0';
  const r1 = await understandAsync(src);
  assert.strictEqual(r1.brainUsed, 'local');

  resetCounts();
  onlineReply = 'say "fixed online"';
  const r2 = await reconsider(src, 'ZeroDivisionError: division by zero');
  assert(r2 !== null, 'reconsider returned a repair');
  assert.strictEqual(r2.brainUsed, 'online', 'reconsider escalated directly to online');
  assert.strictEqual(r2.source, 'say "fixed online"');
  assert.strictEqual(localCalls, 0, 'reconsider skips repeating failed local brain');
  assert.strictEqual(onlineCalls, 1);
  console.log('  ok   reconsider escalates directly to website AI after local runtime failure');
}

// 6. Micro-brain rejects unrecognized NL requests and unknown names
{
  const aiReq = await callMicroBrain({
    source: 'build a weather dashboard with live charts',
    draft: 'build a weather dashboard with live charts',
    unresolved: [1],
    vocabulary: {},
    format: 'ai',
  });
  assert.strictEqual(aiReq, null, 'unmatched format:ai request falls through micro-brain');

  const unkCode = await callMicroBrain({
    source: 'frobnicate(mystery_var)',
    draft: 'frobnicate(mystery_var)',
    unresolved: [1],
    vocabulary: {},
    format: 'canonical',
  });
  assert.strictEqual(unkCode, null, 'code with unknown names falls through micro-brain');
  console.log('  ok   micro-brain passes unrecognized requests and unknown names through');
}

console.log('\nAll fallback & re-understand tests passed!');
