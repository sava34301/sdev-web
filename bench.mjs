import { performance } from 'perf_hooks';

// Simulate 20ms network latency per query
const mockLatency = () => new Promise(resolve => setTimeout(resolve, 20));

async function runBenchmark() {
  console.log('--- Benchmarking Deletions ---');
  const items = Array.from({ length: 50 }, (_, i) => "id-" + i);

  // Baseline: N+1 (Sequential)
  const startSequential = performance.now();
  for (const id of items) {
    await mockLatency();
  }
  const endSequential = performance.now();
  const timeSequential = endSequential - startSequential;
  console.log("Baseline (Sequential N+1 for " + items.length + " items): " + timeSequential.toFixed(2) + "ms");

  // Optimized: Single Bulk Query
  const startBulk = performance.now();
  await mockLatency(); // single network call
  const endBulk = performance.now();
  const timeBulk = endBulk - startBulk;
  console.log("Optimized (Bulk .in() for " + items.length + " items): " + timeBulk.toFixed(2) + "ms");

  console.log("Improvement: " + (timeSequential / timeBulk).toFixed(2) + "x faster");
}

runBenchmark();
