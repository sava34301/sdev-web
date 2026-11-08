import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
  History,
  Layers,
  Terminal,
  Sparkles,
  RefreshCw,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  runStudioCode,
  type StudioRunResult,
  type ChronoStep,
} from '@/studio/runner';
import type { GraphicsCommand } from '@/lang/graphics';

export interface TimeTravelDebuggerProps {
  source: string;
  runtime?: 'v1' | 'v2';
  onJumpToLine?: (line: number) => void;
  onSyncCanvas?: (commands: GraphicsCommand[]) => void;
}

export function TimeTravelDebugger({
  source,
  runtime = 'v1',
  onJumpToLine,
  onSyncCanvas,
}: TimeTravelDebuggerProps) {
  const [traceResult, setTraceResult] = useState<StudioRunResult>(() =>
    runStudioCode(source, { runtime, maxChronoSteps: 600 })
  );
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(350);
  const [viewMode, setViewMode] = useState<'variables' | 'lens' | 'prism'>('variables');

  const recomputeTrace = useCallback(() => {
    setIsPlaying(false);
    const res = runStudioCode(source, { runtime, maxChronoSteps: 600 });
    setTraceResult(res);
    setStepIdx(res.chrono.length > 0 ? res.chrono.length - 1 : 0);
  }, [source, runtime]);

  // Re-run trace when source changes
  useEffect(() => {
    const res = runStudioCode(source, { runtime, maxChronoSteps: 600 });
    setTraceResult(res);
    setStepIdx(res.chrono.length > 0 ? res.chrono.length - 1 : 0);
    setIsPlaying(false);
  }, [source, runtime]);

  const steps = traceResult.chrono;
  const activeStep: ChronoStep | null = useMemo(
    () => (steps.length > 0 ? steps[Math.min(stepIdx, steps.length - 1)] : null),
    [steps, stepIdx]
  );

  // Sync editor cursor & canvas snapshot when user scrubs
  const selectStep = useCallback(
    (nextIndex: number) => {
      if (steps.length === 0) return;
      const clamped = Math.max(0, Math.min(steps.length - 1, nextIndex));
      setStepIdx(clamped);
      const step = steps[clamped];
      if (step) {
        onJumpToLine?.(step.line);
        if (step.canvasSnapshot && step.canvasSnapshot.length > 0) {
          onSyncCanvas?.(step.canvasSnapshot);
        }
      }
    },
    [steps, onJumpToLine, onSyncCanvas]
  );

  // Playback timer
  useEffect(() => {
    if (!isPlaying || steps.length === 0) return;
    const timer = window.setInterval(() => {
      setStepIdx((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;
        const st = steps[next];
        if (st) {
          onJumpToLine?.(st.line);
          if (st.canvasSnapshot && st.canvasSnapshot.length > 0) {
            onSyncCanvas?.(st.canvasSnapshot);
          }
        }
        return next;
      });
    }, speedMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, steps, speedMs, onJumpToLine, onSyncCanvas]);

  const togglePlay = () => {
    if (steps.length === 0) return;
    if (!isPlaying && stepIdx >= steps.length - 1) {
      selectStep(0);
    }
    setIsPlaying((p) => !p);
  };

  return (
    <div className="flex flex-col h-full bg-background/40 text-foreground text-xs overflow-hidden">
      {/* Scrubber Control Bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-muted/20 shrink-0">
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono font-semibold uppercase tracking-wider text-[11px]">
            Time-Travel Scrubber
          </span>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-0.5 ml-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => {
              setIsPlaying(false);
              selectStep(0);
            }}
            disabled={steps.length === 0 || stepIdx === 0}
            title="First step"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => {
              setIsPlaying(false);
              selectStep(stepIdx - 1);
            }}
            disabled={steps.length === 0 || stepIdx === 0}
            title="Step backward"
          >
            <SkipBack className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant={isPlaying ? 'default' : 'outline'}
            className="h-6 px-2 text-[11px] gap-1"
            onClick={togglePlay}
            disabled={steps.length === 0}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isPlaying ? 'Pause' : 'Replay'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => {
              setIsPlaying(false);
              selectStep(stepIdx + 1);
            }}
            disabled={steps.length === 0 || stepIdx >= steps.length - 1}
            title="Step forward"
          >
            <SkipForward className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => {
              setIsPlaying(false);
              selectStep(steps.length - 1);
            }}
            disabled={steps.length === 0 || stepIdx >= steps.length - 1}
            title="Last step"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 flex items-center gap-2 min-w-[160px]">
          <input
            type="range"
            min={0}
            max={Math.max(0, steps.length - 1)}
            value={Math.min(stepIdx, Math.max(0, steps.length - 1))}
            onChange={(e) => {
              setIsPlaying(false);
              selectStep(Number(e.target.value));
            }}
            disabled={steps.length === 0}
            aria-label="Execution timeline scrubber"
            className="flex-1 h-1.5 accent-primary cursor-pointer"
          />
          <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
            {steps.length > 0 ? `Step ${stepIdx + 1}/${steps.length}` : '0 steps'}
          </span>
        </div>

        {/* Speed & Sub-Mode Selector */}
        <div className="flex items-center gap-1.5">
          <select
            value={speedMs}
            onChange={(e) => setSpeedMs(Number(e.target.value))}
            className="h-6 rounded border border-border/50 bg-background px-1.5 text-[10px] font-mono outline-none"
            title="Replay speed"
          >
            <option value={700}>0.5x</option>
            <option value={350}>1x</option>
            <option value={160}>2x</option>
            <option value={60}>4x</option>
          </select>

          <div className="flex rounded border border-border/50 bg-background/60 p-0.5 font-mono text-[10px]">
            {(['variables', 'lens', 'prism'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`px-2 py-0.5 rounded capitalize transition-colors ${
                  viewMode === m
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'variables' ? 'Memory' : m === 'lens' ? 'Live Lens' : 'Prism AST'}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={recomputeTrace}
            title="Re-trace execution"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Error Banner if execution threw */}
      {traceResult.error && (
        <div className="flex items-center gap-2 px-3 py-1 bg-destructive/15 border-b border-destructive/30 text-destructive font-mono text-[11px] shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {traceResult.errorLine ? `Line ${traceResult.errorLine}: ` : ''}
            {traceResult.error}
          </span>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40 overflow-hidden">
        {/* Column 1: Active Step Summary & Call Stack */}
        <div className="p-2.5 flex flex-col gap-2 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Active Execution Frame
            </span>
            {activeStep && (
              <button
                type="button"
                onClick={() => onJumpToLine?.(activeStep.line)}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
              >
                Line {activeStep.line} • {activeStep.elapsedMs}ms
              </button>
            )}
          </div>

          {activeStep ? (
            <>
              <div className="rounded border border-primary/30 bg-primary/5 p-2 font-mono space-y-1">
                <div className="text-[10px] text-primary flex items-center justify-between">
                  <span>{activeStep.nodeType}</span>
                  {activeStep.resultValue !== undefined && (
                    <span className="px-1 rounded bg-emerald-500/15 text-emerald-400">
                      ⇒ {activeStep.resultValue}
                    </span>
                  )}
                </div>
                <div className="text-xs text-foreground break-all font-semibold">
                  {activeStep.code || activeStep.summary}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {activeStep.summary}
                </div>
              </div>

              {/* Call Stack */}
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Call Stack ({activeStep.callStack.length})
                </div>
                <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                  {activeStep.callStack.map((frame, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded border border-border/50 bg-card text-foreground"
                    >
                      {frame}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground/50 font-mono text-[11px] italic py-4 text-center">
              No execution steps recorded for this file.
            </div>
          )}
        </div>

        {/* Column 2: Memory Inspector / Live Lens / Prism AST */}
        <div className="p-2.5 flex flex-col gap-2 overflow-y-auto">
          {viewMode === 'variables' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Variable Scope State ({activeStep?.variableList.length ?? 0})
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  @ step {activeStep ? activeStep.index + 1 : 0}
                </span>
              </div>
              {activeStep && activeStep.variableList.length > 0 ? (
                <div className="space-y-1">
                  {activeStep.variableList.map((v) => (
                    <div
                      key={v.name}
                      className={`flex items-center justify-between gap-2 px-2 py-1 rounded border font-mono text-[11px] ${
                        v.changed
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-border/30 bg-background/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-foreground truncate">{v.name}</span>
                        <span className="text-[9px] px-1 rounded bg-muted text-muted-foreground">
                          {v.type}
                        </span>
                        {v.changed && (
                          <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                            CHANGED
                          </span>
                        )}
                      </div>
                      <span className="text-primary truncate max-w-[140px]" title={v.value}>
                        {v.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground/50 font-mono text-[11px] italic py-4 text-center">
                  No user variables bound at this step.
                </div>
              )}
            </>
          )}

          {viewMode === 'lens' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Eye className="w-3 h-3 text-cyan-400" /> Live Lens Annotations ({traceResult.liveLensList.length})
                </span>
              </div>
              <div className="space-y-1">
                {traceResult.liveLensList.map((entry) => (
                  <button
                    key={entry.line}
                    type="button"
                    onClick={() => onJumpToLine?.(entry.line)}
                    className="w-full text-left flex items-center justify-between gap-2 px-2 py-1 rounded border border-border/30 bg-background/50 hover:border-primary/40 font-mono text-[11px]"
                  >
                    <span className="text-muted-foreground">
                      L{entry.line}{' '}
                      <span className="text-[9px] px-1 rounded bg-primary/15 text-primary">
                        ×{entry.hits}
                      </span>
                    </span>
                    <span className="truncate text-foreground">{entry.display}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {viewMode === 'prism' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" /> Prism AST Metrics
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {traceResult.prism.nodeCount} nodes • {traceResult.prism.tokenCount} tokens
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                {Object.entries(traceResult.prism.nodeCountsByType).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between px-2 py-1 rounded border border-border/30 bg-background/40"
                  >
                    <span className="truncate text-muted-foreground">{type}</span>
                    <span className="font-semibold text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Column 3: Console Output Snapshot up to this Step */}
        <div className="p-2.5 flex flex-col gap-2 overflow-y-auto bg-background/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Terminal className="w-3 h-3 text-emerald-400" /> Output Snapshot (
              {activeStep?.outputSnapshot.length ?? 0} lines)
            </span>
          </div>
          <div className="flex-1 font-mono text-[11px] space-y-0.5">
            {activeStep && activeStep.outputSnapshot.length > 0 ? (
              activeStep.outputSnapshot.map((line, idx) => (
                <div
                  key={idx}
                  className={`px-1.5 py-0.5 rounded ${
                    idx === activeStep.outputSnapshot.length - 1
                      ? 'bg-emerald-500/10 text-emerald-300 font-semibold'
                      : 'text-foreground/80'
                  }`}
                >
                  {line}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground/40 italic py-4 text-center">
                No console output emitted up to this step.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
