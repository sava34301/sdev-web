import assert from 'node:assert';
import { evaluateLiveScratchpad } from '../src/lang/eval-live';
import { runBenchmark, formatBenchmarkReport } from '../src/lang/benchmark';
import { parseNotebook, executeNotebook } from '../src/lang/notebook';

console.log('=== SDEV TDD Expansion Test Suite ===\n');

let pass = 0;
let fail = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      pass++;
    } catch (err: unknown) {
      console.error(`  ✗ ${name}:`, err instanceof Error ? err.message : err);
      fail++;
    }
  })();
}

async function run() {
  console.log('--- 1. Live Interactive Scratchpad (src/lang/eval-live.ts) ---');

  await test('Evaluates basic arithmetic expressions with type', async () => {
    const code = 'set x to 10\nset y to x * 3 + 2';
    const res = await evaluateLiveScratchpad(code);
    assert(res.lines.length === 2, 'Evaluates both lines');
    assert(res.lines[0].value === '10' && res.lines[0].type === 'number', 'Line 1 is 10 (number)');
    assert(res.lines[1].value === '32' && res.lines[1].type === 'number', 'Line 2 is 32 (number)');
  });

  await test('Evaluates list and string operations', async () => {
    const code = 'set greeting to "hello " + "world"\nset items to [1, 2, 3] + [4]';
    const res = await evaluateLiveScratchpad(code);
    assert(res.lines[0].value === 'hello world' && res.lines[0].type === 'string', 'String joined');
    assert(res.lines[1].value === '[1, 2, 3, 4]' && res.lines[1].type === 'list', 'List appended');
  });

  await test('Captures statement outputs from say', async () => {
    const code = 'say "Alpha"\nsay "Beta"';
    const res = await evaluateLiveScratchpad(code);
    assert(res.lines[0].output?.includes('Alpha'), 'Line 1 outputs Alpha');
    assert(res.lines[1].output?.includes('Beta'), 'Line 2 outputs Beta');
    assert(res.allOutputs.includes('Alpha') && res.allOutputs.includes('Beta'), 'Aggregated output contains both');
  });

  await test('Safely limits infinite loops via instruction guard', async () => {
    const code = 'while true\nend';
    const res = await evaluateLiveScratchpad(code, { maxInstructions: 500 });
    assert(res.hasError, 'Traps infinite loop error');
    assert(res.lines.some((l) => l.error && /limit|budget|timeout/i.test(l.error)), 'Reports instruction limit exceeded');
  });

  await test('Evaluates functions declared and called across lines', async () => {
    const code = `
to triple with n
  return n * 3
end
set ans to triple(7)
say ans
`.trim();
    const res = await evaluateLiveScratchpad(code);
    const ansLine = res.lines.find((l) => l.code.includes('set ans to triple(7)'));
    assert(ansLine && ansLine.value === '21', 'Calculated triple(7) === 21');
    assert(res.allOutputs.includes('21'), 'Outputs 21');
  });

  console.log('\n--- 2. Micro-Benchmarking & Profiling Engine (src/lang/benchmark.ts) ---');

  await test('Benchmarks a JavaScript function and computes stats', async () => {
    let acc = 0;
    const res = await runBenchmark('Math Accumulator', () => {
      acc = (acc + 1) % 1000;
    }, { warmup: 50, iterations: 200 });

    assert(res.name === 'Math Accumulator', 'Benchmark name matches');
    assert(res.iterations === 200, 'Iterations match');
    assert(res.opsPerSec > 0, 'opsPerSec is positive');
    assert(res.minMs <= res.p50Ms, 'min <= p50');
    assert(res.p50Ms <= res.p95Ms, 'p50 <= p95');
    assert(res.p95Ms <= res.p99Ms, 'p95 <= p99');
    assert(res.p99Ms <= res.maxMs, 'p99 <= max');
  });

  await test('Benchmarks an SDEV source code snippet', async () => {
    const sdevCode = 'set sum to 0\nfor each i in sequence(1, 10)\n  set sum to sum + i\nend';
    const res = await runBenchmark('SDEV Loop 1..10', sdevCode, { warmup: 10, iterations: 30 });
    assert(res.iterations === 30, 'Runs SDEV script iterations');
    assert(res.opsPerSec > 0, 'SDEV ops/sec calculated');
    assert(typeof res.meanMs === 'number', 'Mean latency computed');
  });

  await test('Formats ASCII latency histogram report', async () => {
    const res = await runBenchmark('Dummy Bench', () => {}, { warmup: 10, iterations: 50 });
    const report = formatBenchmarkReport(res);
    assert(report.includes('Dummy Bench'), 'Report contains benchmark name');
    assert(report.includes('ops/sec'), 'Report contains ops/sec');
    assert(report.includes('p50:'), 'Report contains percentiles');
    assert(report.includes('█') || report.includes('#') || report.includes('|'), 'Report contains distribution bar');
  });

  console.log('\n--- 3. Literate Markdown Notebook Engine (src/lang/notebook.ts) ---');

  await test('Parses markdown into structured cells', async () => {
    const md = `
# Interactive Notebook
This is an introductory cell.

\`\`\`sdev
set a to 10
\`\`\`

Here is intermediate text.

\`\`\`sdev
set b to a + 5
say b
\`\`\`
`.trim();

    const nb = parseNotebook(md);
    assert(nb.cells.length === 4, `Parsed 4 cells (got ${nb.cells.length})`);
    assert(nb.cells[0].kind === 'markdown', 'Cell 0 is markdown');
    assert(nb.cells[1].kind === 'code', 'Cell 1 is code');
    assert(nb.cells[2].kind === 'markdown', 'Cell 2 is markdown');
    assert(nb.cells[3].kind === 'code', 'Cell 3 is code');
  });

  await test('Executes code cells sequentially preserving variables', async () => {
    const md = `
\`\`\`sdev
set count to 100
\`\`\`

\`\`\`sdev
set count to count + 50
say count
\`\`\`
`.trim();

    const res = await executeNotebook(md);
    assert(res.success, 'Notebook executes successfully');
    assert(res.codeCellsExecuted === 2, '2 code cells executed');
    assert(res.allOutputs.includes('150'), 'Output 150 preserved across cells');
  });

  await test('Handles and isolates cell errors without crashing notebook', async () => {
    const md = `
\`\`\`sdev
set x to 42
\`\`\`

\`\`\`sdev
this is completely broken syntax !!! @#$
\`\`\`

\`\`\`sdev
say x
\`\`\`
`.trim();

    const res = await executeNotebook(md);
    assert(!res.success, 'Notebook indicates overall execution error');
    assert(res.cellResults[1].error !== null, 'Cell 1 captures error');
    assert(res.cellResults[0].success, 'Cell 0 succeeded');
  });

  console.log(`\n=== TDD Results: ${pass} passed, ${fail} failed ===`);
  process.exit(fail ? 1 : 0);
}

run();
