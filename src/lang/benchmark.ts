/**
 * SDEV High-Precision Micro-Benchmarking & Profiling Engine (`src/lang/benchmark.ts`)
 *
 * Measures high-resolution timing, operations per second, latency percentiles
 * (min, p50, p95, p99, max), and produces formatted distribution bar reports.
 */

import { execute } from './executor';
import { createSdevModuleRunner, type SdevModuleRunner } from './sdev-module';
import SDEV_TEXT_SRC from '../../lang/stdlib/v2/text.sdev?raw';
import SDEV_NOTEBOOK_SRC from '../../lang/runtime/notebook.sdev?raw';

let benchRunner: SdevModuleRunner | null = null;
function getBenchRunner(): SdevModuleRunner {
  if (!benchRunner) benchRunner = createSdevModuleRunner(SDEV_TEXT_SRC, SDEV_NOTEBOOK_SRC);
  return benchRunner;
}

export interface BenchmarkOptions {
  warmup?: number;
  iterations?: number;
  timeoutMs?: number;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  opsPerSec: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  totalDurationMs: number;
  samplesMs: number[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return Number((sorted[lower] * (1 - weight) + sorted[upper] * weight).toFixed(4));
}

export async function runBenchmark(
  name: string,
  target: string | (() => void | Promise<void>),
  options: BenchmarkOptions = {}
): Promise<BenchmarkResult> {
  const warmup = options.warmup ?? 10;
  const iterations = options.iterations ?? 100;

  const runOnce = typeof target === 'function'
    ? target
    : () => {
        execute(target);
      };

  // 1. Warm-up Phase
  for (let i = 0; i < warmup; i++) {
    const r = runOnce();
    if (r instanceof Promise) await r;
  }

  // 2. Measurement Phase
  const samples: number[] = [];
  const tTotalStart = performance.now();

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    const r = runOnce();
    if (r instanceof Promise) await r;
    const dur = Math.max(0.0001, performance.now() - t0);
    samples.push(dur);
  }

  const totalDurationMs = performance.now() - tTotalStart;
  const [rawMean, rawMin, rawMax, rawP50, rawP95, rawP99] = getBenchRunner().call('bench_compute', samples) as number[];
  const meanMs = Number(rawMean.toFixed(4));
  const minMs = Number(rawMin.toFixed(4));
  const maxMs = Number(rawMax.toFixed(4));
  const p50Ms = Number(rawP50.toFixed(4));
  const p95Ms = Number(rawP95.toFixed(4));
  const p99Ms = Number(rawP99.toFixed(4));

  // Operations per second: iterations / total time in seconds
  const totalSec = totalDurationMs / 1000;
  const opsPerSec = totalSec > 0 ? Math.round(iterations / totalSec) : 0;

  return {
    name,
    iterations,
    opsPerSec,
    meanMs,
    minMs,
    maxMs,
    p50Ms,
    p95Ms,
    p99Ms,
    totalDurationMs,
    samplesMs: samples,
  };
}

/**
 * Formats a benchmark result into a terminal or UI ASCII report with percentiles
 * and a distribution bar.
 */
export function formatBenchmarkReport(res: BenchmarkResult): string {
  const barWidth = 24;
  const [, , , , , , , rawFilled] = getBenchRunner().call('bench_compute', [res.minMs, res.p50Ms, res.maxMs]) as number[];
  const filled = Math.min(barWidth, Math.max(1, Number(rawFilled || 1)));
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

  return [
    `=== Benchmark: ${res.name} ===`,
    `  Iterations : ${res.iterations}`,
    `  Throughput : ${res.opsPerSec.toLocaleString()} ops/sec`,
    `  Mean       : ${res.meanMs.toFixed(3)} ms`,
    `  Percentiles:`,
    `    min: ${res.minMs.toFixed(3)} ms`,
    `    p50: ${res.p50Ms.toFixed(3)} ms`,
    `    p95: ${res.p95Ms.toFixed(3)} ms`,
    `    p99: ${res.p99Ms.toFixed(3)} ms`,
    `    max: ${res.maxMs.toFixed(3)} ms`,
    `  Distribution: [${bar}]`,
  ].join('\n');
}
