import { useEffect, useRef } from 'react';

export function CompilerScene({ panels }: { panels: { label: string; lines: string[] }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    const section = host?.closest('section');
    if (!host || !section) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const size = matchMedia('(min-width: 768px)');
    let dispose: (() => void) | undefined;
    let generation = 0;
    const start = () => {
      const current = ++generation;
      dispose?.(); dispose = undefined;
      host.dataset.ready = 'false';
      if (motion.matches || !size.matches) return;
      import('./compilerScene').then(({ createCompilerScene }) => {
        if (generation !== current) return;
        try { dispose = createCompilerScene(host, section, panels); host.dataset.ready = 'true'; }
        catch { host.dataset.ready = 'false'; }
      }).catch(() => { host.dataset.ready = 'false'; });
    };
    start(); motion.addEventListener('change', start); size.addEventListener('change', start);
    return () => { generation++; dispose?.(); motion.removeEventListener('change', start); size.removeEventListener('change', start); };
  }, [panels]);
  return <div ref={ref} className="compiler-world" aria-hidden="true" />;
}