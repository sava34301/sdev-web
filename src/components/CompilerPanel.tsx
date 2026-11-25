import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Cpu, Download, Play, ChevronDown, ChevronRight, Code2, Zap } from 'lucide-react';
import { Lexer } from '@/lang/core/lexer';
import { Parser } from '@/lang/core/parser';
import { Compiler } from '@/lang/runtime/compiler';
import { VM } from '@/lang/runtime/vm';
import { disassemble, Chunk, serializeChunk } from '@/lang/runtime/bytecode';
import { SdevError } from '@/lang/core/errors';
import { downloadBlob, downloadText } from '@/lib/download';

interface CompilerPanelProps {
  code: string;
  onOutput: (lines: string[], error?: string) => void;
}

export function CompilerPanel({ code, onOutput }: CompilerPanelProps) {
  const [chunk, setChunk] = useState<Chunk | null>(null);
  const [disasm, setDisasm] = useState<string>('');
  const [showDisasm, setShowDisasm] = useState(false);
  const [compileError, setCompileError] = useState<string>();
  const [compileTime, setCompileTime] = useState<number>();
  const [runTime, setRunTime] = useState<number>();
  const [phase, setPhase] = useState<'idle' | 'compiled' | 'ran'>('idle');

  const handleCompile = useCallback(() => {
    try {
      const t0 = performance.now();
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const compiler = new Compiler();
      const compiled = compiler.compile(ast);
      const t1 = performance.now();

      setChunk(compiled);
      setDisasm(disassemble(compiled.entry));
      setCompileError(undefined);
      setCompileTime(Math.round((t1 - t0) * 100) / 100);
      setPhase('compiled');
    } catch (e) {
      setCompileError(e instanceof SdevError ? e.message : String(e));
      setChunk(null);
      setPhase('idle');
    }
  }, [code]);

  const handleRun = useCallback(() => {
    if (!chunk) return;
    const outputLines: string[] = [];
    try {
      const t0 = performance.now();
      const vm = new VM((msg) => outputLines.push(msg));
      vm.run(chunk);
      const t1 = performance.now();
      setRunTime(Math.round((t1 - t0) * 100) / 100);
      setPhase('ran');
      onOutput(outputLines, undefined);
    } catch (e) {
      onOutput(outputLines, e instanceof SdevError ? e.message : String(e));
    }
  }, [chunk, onOutput]);

  const handleDownloadBytecode = useCallback(() => {
    if (!chunk) return;
    const binary = serializeChunk(chunk);
    downloadBlob(new Blob([binary], { type: 'application/octet-stream' }), 'output.sdevc');
  }, [chunk]);

  const handleDownloadDisasm = useCallback(() => {
    if (!disasm) return;
    downloadText(disasm, 'output.sdevir');
  }, [disasm]);

  // Count total instructions
  const countInstructions = (chunk: Chunk): number => {
    const count = (fn: typeof chunk.entry): number =>
      fn.code.length + fn.functions.reduce((s, f) => s + count(f), 0);
    return count(chunk.entry);
  };

  return (
    <div className="rounded-lg border border-border/50 glass overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-violet/10 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-foreground text-sm">Bytecode Compiler</span>
            <p className="text-xs text-muted-foreground font-mono">sdev → IR → VM</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {chunk && (
            <>
              <Button size="sm" variant="outline" onClick={handleDownloadBytecode} className="gap-1.5 text-xs border-border/50">
                <Download className="w-3 h-3" />
                .sdevc
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadDisasm} className="gap-1.5 text-xs border-border/50">
                <Download className="w-3 h-3" />
                .sdevir
              </Button>
              <Button
                size="sm"
                onClick={handleRun}
                className="gap-1.5 text-xs bg-gradient-to-r from-neon-cyan to-neon-violet border-0 text-primary-foreground"
              >
                <Play className="w-3 h-3" />
                Run VM
              </Button>
            </>
          )}
          <Button
            size="sm"
            onClick={handleCompile}
            variant={phase === 'idle' ? 'default' : 'secondary'}
            className="gap-1.5 text-xs"
          >
            <Zap className="w-3 h-3" />
            Compile
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Error */}
        {compileError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-xs font-mono text-destructive">{compileError}</p>
          </div>
        )}

        {/* Stats */}
        {chunk && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Instructions', value: countInstructions(chunk) },
              { label: 'Functions', value: chunk.entry.functions.length },
              { label: 'Compile', value: compileTime ? `${compileTime}ms` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-md bg-background/50 border border-border/30 p-2 text-center">
                <p className="text-lg font-bold font-mono text-primary">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Run time badge */}
        {phase === 'ran' && runTime !== undefined && (
          <div className="flex items-center gap-2 text-xs text-neon-green font-mono">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            VM executed in {runTime}ms
          </div>
        )}

        {/* Disassembly toggle */}
        {chunk && (
          <div>
            <button
              onClick={() => setShowDisasm(!showDisasm)}
              className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDisasm ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Code2 className="w-3 h-3" />
              {showDisasm ? 'Hide' : 'Show'} disassembly
            </button>
            {showDisasm && (
              <pre className="mt-2 rounded-md bg-background/70 border border-border/30 p-3 text-xs font-mono text-muted-foreground overflow-auto max-h-64 leading-5">
                {disasm}
              </pre>
            )}
          </div>
        )}

        {/* Idle state */}
        {phase === 'idle' && !compileError && (
          <p className="text-xs text-muted-foreground font-mono text-center py-2">
            Click <span className="text-primary">Compile</span> to generate bytecode IR from your sdev code
          </p>
        )}
      </div>
    </div>
  );
}
