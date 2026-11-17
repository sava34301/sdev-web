import React, { useState, useEffect } from 'react';
import { Sparkles, Gauge, BookOpen, Play, CheckCircle2, AlertTriangle } from 'lucide-react';
import { evaluateLiveScratchpad, type LiveScratchpadResult } from '@/lang/eval-live';
import { runBenchmark, formatBenchmarkReport, type BenchmarkResult } from '@/lang/benchmark';
import { executeNotebook, type NotebookExecutionResult } from '@/lang/notebook';

interface Props {
  source: string;
  onJumpToLine?: (line: number) => void;
}

export function LiveScratchpadPanel({ source, onJumpToLine }: Props) {
  const [activeTab, setActiveTab] = useState<'scratchpad' | 'benchmark' | 'notebook'>('scratchpad');
  const [scratchResult, setScratchResult] = useState<LiveScratchpadResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Benchmark state
  const [benchIterations, setBenchIterations] = useState(100);
  const [benchResult, setBenchResult] = useState<BenchmarkResult | null>(null);
  const [benchReport, setBenchReport] = useState<string>('');
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  // Notebook state
  const [notebookResult, setNotebookResult] = useState<NotebookExecutionResult | null>(null);
  const [isExecutingNotebook, setIsExecutingNotebook] = useState(false);

  // Auto-evaluate scratchpad when source changes
  useEffect(() => {
    let cancelled = false;
    setIsEvaluating(true);
    evaluateLiveScratchpad(source, { maxInstructions: 5000 })
      .then((res) => {
        if (!cancelled) {
          setScratchResult(res);
          setIsEvaluating(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsEvaluating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  const handleRunBenchmark = async () => {
    if (!source.trim()) return;
    setIsBenchmarking(true);
    try {
      const res = await runBenchmark('Active Editor Code', source, {
        warmup: 10,
        iterations: benchIterations,
      });
      setBenchResult(res);
      setBenchReport(formatBenchmarkReport(res));
    } catch (err) {
      setBenchReport(`Benchmark failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleRunNotebook = async () => {
    setIsExecutingNotebook(true);
    try {
      const res = await executeNotebook(source);
      setNotebookResult(res);
    } catch {
      // ignore
    } finally {
      setIsExecutingNotebook(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background font-mono text-xs select-none">
      {/* Sub-header toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('scratchpad')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              activeTab === 'scratchpad' ? 'bg-primary/20 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3 h-3" /> Live Inspector
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              activeTab === 'benchmark' ? 'bg-primary/20 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Gauge className="w-3 h-3" /> Micro-Benchmark
          </button>
          <button
            onClick={() => setActiveTab('notebook')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              activeTab === 'notebook' ? 'bg-primary/20 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-3 h-3" /> Markdown Notebook
          </button>
        </div>

        <div className="flex-1" />

        {activeTab === 'benchmark' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Iterations:</span>
            <select
              value={benchIterations}
              onChange={(e) => setBenchIterations(Number(e.target.value))}
              className="bg-muted border border-border/60 rounded px-1.5 py-0.5 text-[11px]"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1,000</option>
            </select>
            <button
              onClick={handleRunBenchmark}
              disabled={isBenchmarking}
              className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              <Play className="w-3 h-3" /> {isBenchmarking ? 'Running…' : 'Benchmark'}
            </button>
          </div>
        )}

        {activeTab === 'notebook' && (
          <button
            onClick={handleRunNotebook}
            disabled={isExecutingNotebook}
            className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            <Play className="w-3 h-3" /> {isExecutingNotebook ? 'Running Cells…' : 'Run All Cells'}
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-3">
        {/* TAB 1: Live Scratchpad Inspector */}
        {activeTab === 'scratchpad' && (
          <div>
            {isEvaluating && (
              <div className="text-[11px] text-muted-foreground mb-2 animate-pulse">Evaluating expressions live…</div>
            )}
            {!scratchResult || scratchResult.lines.length === 0 ? (
              <div className="text-muted-foreground py-4 text-center">Type SDEV code in the editor to see live expression values and types.</div>
            ) : (
              <div className="space-y-1">
                {scratchResult.lines.map((l) => (
                  <div
                    key={l.lineNumber}
                    onClick={() => onJumpToLine?.(l.lineNumber)}
                    className="flex items-center gap-3 px-2 py-1 rounded hover:bg-muted/30 cursor-pointer group"
                  >
                    <span className="w-6 text-right text-muted-foreground/60 text-[10px] select-none font-mono">
                      {l.lineNumber}
                    </span>
                    <span className="text-foreground/90 font-mono truncate max-w-xs">{l.code}</span>
                    <div className="flex-1" />
                    {l.error ? (
                      <span className="text-destructive text-[11px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {l.error}
                      </span>
                    ) : l.value ? (
                      <div className="flex items-center gap-2">
                        {l.type && (
                          <span className="px-1.5 py-0.5 rounded bg-muted/60 text-[10px] text-primary/80 uppercase tracking-wider">
                            {l.type}
                          </span>
                        )}
                        <span className="text-emerald-400 font-semibold">{l.value}</span>
                      </div>
                    ) : l.output && l.output.length > 0 ? (
                      <span className="text-amber-300 text-[11px]">↳ {l.output.join(', ')}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Micro-Benchmarking Report */}
        {activeTab === 'benchmark' && (
          <div>
            {!benchReport ? (
              <div className="py-6 text-center text-muted-foreground">
                Click &quot;Benchmark&quot; above to measure ops/sec and percentile latencies for the current code.
              </div>
            ) : (
              <div className="bg-card/40 border border-border/60 rounded-md p-3">
                <pre className="text-emerald-400 whitespace-pre font-mono leading-relaxed">{benchReport}</pre>
                {benchResult && (
                  <div className="mt-3 grid grid-cols-4 gap-2 pt-2 border-t border-border/40 text-center">
                    <div className="p-2 bg-muted/20 rounded">
                      <div className="text-[10px] text-muted-foreground">THROUGHPUT</div>
                      <div className="text-sm font-bold text-foreground">{benchResult.opsPerSec.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded">
                      <div className="text-[10px] text-muted-foreground">p50 MEDIAN</div>
                      <div className="text-sm font-bold text-foreground">{benchResult.p50Ms.toFixed(3)} ms</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded">
                      <div className="text-[10px] text-muted-foreground">p95 LATENCY</div>
                      <div className="text-sm font-bold text-foreground">{benchResult.p95Ms.toFixed(3)} ms</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded">
                      <div className="text-[10px] text-muted-foreground">TOTAL DURATION</div>
                      <div className="text-sm font-bold text-foreground">{benchResult.totalDurationMs.toFixed(1)} ms</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Literate Markdown Notebook */}
        {activeTab === 'notebook' && (
          <div>
            {!notebookResult ? (
              <div className="py-6 text-center text-muted-foreground">
                Supports literate programming in markdown files with sequential SDEV code cells.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {notebookResult.success ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> All {notebookResult.codeCellsExecuted} code cells passed
                    </span>
                  ) : (
                    <span className="text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Execution failed in one or more cells
                    </span>
                  )}
                  <span className="text-muted-foreground ml-auto">Total: {notebookResult.totalDurationMs.toFixed(1)} ms</span>
                </div>
                {notebookResult.cellResults.map((cr, idx) => (
                  <div key={idx} className="p-2 rounded border border-border/40 bg-card/30">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-foreground/80">Code Cell #{idx + 1}</span>
                      <span className="text-muted-foreground">{cr.durationMs.toFixed(2)} ms</span>
                    </div>
                    {cr.error ? (
                      <div className="text-destructive text-[11px]">{cr.error}</div>
                    ) : cr.output.length > 0 ? (
                      <pre className="text-amber-300 text-[11px] whitespace-pre-wrap">{cr.output.join('\n')}</pre>
                    ) : (
                      <div className="text-muted-foreground/60 text-[10px] italic">No console output emitted.</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
