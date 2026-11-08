import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Cpu,
  Download,
  Copy,
  Check,
  Play,
  FileCode2,
  Boxes,
} from 'lucide-react';
import {
  buildWasiComponentBundle,
} from '@/lang/wasi-component';
import { toast } from 'sonner';

interface WasiComponentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: string;
  fileName: string;
}

export function WasiComponentDialog({
  open,
  onOpenChange,
  source,
  fileName,
}: WasiComponentDialogProps) {
  const bundle = useMemo(
    () => buildWasiComponentBundle(source, fileName),
    [source, fileName]
  );

  const [activeTab, setActiveTab] = useState<'wit' | 'typescript' | 'python' | 'rust' | 'go'>('wit');
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const activeCode = useMemo(() => {
    if (activeTab === 'wit') return bundle.wit;
    return bundle.bindings[activeTab];
  }, [activeTab, bundle]);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode).catch(() => {});
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadWasm = () => {
    const blob = new Blob([bundle.wasmBytes.buffer as ArrayBuffer], { type: 'application/wasm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bundle.worldName}.wasm`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${bundle.worldName}.wasm (${bundle.wasmBytes.byteLength} bytes)`);
  };

  const downloadWit = () => {
    const blob = new Blob([bundle.wit], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bundle.worldName}.wit`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${bundle.worldName}.wit`);
  };

  const runLiveWasmVerification = useCallback(async () => {
    try {
      const { instance } = await WebAssembly.instantiate(
        bundle.wasmBytes.buffer.slice(
          bundle.wasmBytes.byteOffset,
          bundle.wasmBytes.byteOffset + bundle.wasmBytes.byteLength
        ) as ArrayBuffer,
        {}
      );
      const exportedNames = Object.keys(instance.exports);
      const firstFnName = bundle.exports[0]?.name ?? 'run';
      const fn = instance.exports[firstFnName] as ((...args: number[]) => number) | undefined;
      if (typeof fn === 'function') {
        const sampleArgs = (bundle.exports[0]?.params ?? []).map((_, i) => (i + 1) * 5);
        const res = fn(...sampleArgs);
        setTestResult(
          `Verified WASI/WASM instantiation! Exports: [${exportedNames.join(', ')}] • ${firstFnName}(${sampleArgs.join(', ')}) => ${res}`
        );
      } else {
        setTestResult(
          `Verified WASI/WASM binary (${bundle.wasmBytes.byteLength}B). Exports: [${exportedNames.join(', ')}]`
        );
      }
      toast.success('WASM Component instantiated & verified in browser');
    } catch (e) {
      setTestResult(`Verification error: ${(e as Error).message}`);
    }
  }, [bundle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border/60 text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-mono">
            <Boxes className="w-4 h-4 text-primary" />
            WASI 0.2 Component Model Export — {bundle.packageName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Compile your SDEV functions into a portable WebAssembly Component (<code>.wasm</code>) and WIT interface (<code>.wit</code>) importable from Rust, Python, Go, and Node.js.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          {/* Discovered Exports Summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/40 bg-background/50 px-3 py-2 font-mono">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {bundle.exports.length} exported function{bundle.exports.length === 1 ? '' : 's'} •{' '}
                {bundle.wasmBytes.byteLength} bytes <code>.wasm</code>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px] gap-1"
                onClick={runLiveWasmVerification}
              >
                <Play className="w-3 h-3 text-emerald-400" /> Verify Binary
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px] gap-1"
                onClick={downloadWit}
              >
                <FileCode2 className="w-3 h-3 text-cyan-400" /> .wit
              </Button>
              <Button
                size="sm"
                className="h-6 px-2.5 text-[11px] gap-1"
                onClick={downloadWasm}
              >
                <Download className="w-3 h-3" /> .wasm
              </Button>
            </div>
          </div>

          {testResult && (
            <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-mono text-[11px] text-emerald-300">
              {testResult}
            </div>
          )}

          {/* Tab Bar: WIT vs Host Languages */}
          <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
            <div className="flex gap-1 font-mono text-[11px]">
              {(
                [
                  { id: 'wit', label: 'WIT 0.2 Spec' },
                  { id: 'typescript', label: 'Node / TS' },
                  { id: 'python', label: 'Python' },
                  { id: 'rust', label: 'Rust' },
                  { id: 'go', label: 'Go' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeTab === t.id
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px] gap-1"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* Code Viewer */}
          <pre className="max-h-72 overflow-auto rounded border border-border/50 bg-background/80 p-3 font-mono text-[11px] leading-relaxed text-foreground/90 whitespace-pre">
            {activeCode}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
