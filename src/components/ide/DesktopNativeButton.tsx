import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Global bridge type exposed by electron/preload.cjs.
declare global {
  interface Window {
    sdevDesktop?: {
      isDesktop: true;
      platform: () => Promise<{ platform: string; arch: string; version: string }>;
      openFile: () => Promise<{ path: string; content: string } | null>;
      saveFile: (p: { path?: string; content: string }) => Promise<{ path: string } | null>;
      compileNative: (p: { source: string; outPath?: string }) => Promise<
        { ok: true; outPath: string; asmPath: string } | { ok: false; error?: string; cancelled?: boolean }
      >;
      runNative: (p: { outPath: string }) => Promise<{ status: number; stdout: string; stderr: string }>;
    };
  }
}

interface Props {
  /** Source getter — called at click time so we always send the current buffer. */
  getSource: () => string;
}

/**
 * Floating "Build Native" pill. Rendered by IDE.tsx; renders nothing in the browser
 * (feature-detects `window.sdevDesktop`). In the Electron shell it exposes the
 * real x86-64 assembly pipeline: SDEV → GAS → `as` → `ld` → ELF.
 */
export function DesktopNativeButton({ getSource }: Props) {
  const [bridge, setBridge] = useState<Window['sdevDesktop']>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.sdevDesktop) setBridge(window.sdevDesktop);
  }, []);

  if (!bridge) return null;

  const build = async (thenRun: boolean) => {
    setBusy(true);
    try {
      const source = getSource();
      const r = await bridge.compileNative({ source });
      if (!r.ok) {
        if (!('cancelled' in r && r.cancelled)) toast.error(`Native build failed: ${(r as any).error}`);
        return;
      }
      toast.success(`Built ${r.outPath}`);
      if (thenRun) {
        const run = await bridge.runNative({ outPath: r.outPath });
        toast.message(`exit ${run.status}`, { description: run.stdout || run.stderr || '(no output)' });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-2">
      <button
        onClick={() => build(false)}
        disabled={busy}
        className="px-3 py-1.5 rounded-md text-xs font-mono bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 disabled:opacity-50"
        title="Compile the current buffer to a native x86-64 ELF (requires binutils on PATH)"
      >
        {busy ? 'Building…' : 'Build Native'}
      </button>
      <button
        onClick={() => build(true)}
        disabled={busy}
        className="px-3 py-1.5 rounded-md text-xs font-mono bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/30 disabled:opacity-50"
        title="Build the native binary and immediately run it"
      >
        Build &amp; Run
      </button>
    </div>
  );
}
