import { useEffect, useRef } from 'react';

export function CompilerScrollScene() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 768px)');
    let disposed = false;
    let scene: Awaited<ReturnType<typeof import('./compilerScene')['createCompilerScene']>> | undefined;
    const update = () => {
      if (motion.matches || !desktop.matches) return;
      const section = canvas.closest<HTMLElement>('.how');
      scene?.render(Number(section?.style.getPropertyValue('--how') || 0));
    };
    import('./compilerScene').then(({ createCompilerScene }) => {
      if (disposed) return;
      try { scene = createCompilerScene(canvas); update(); } catch { canvas.style.display = 'none'; }
    });
    const resize = new ResizeObserver(() => scene?.resize()); resize.observe(canvas);
    window.addEventListener('sdev:scroll-scene', update);
    return () => { disposed = true; resize.disconnect(); window.removeEventListener('sdev:scroll-scene', update); scene?.dispose(); };
  }, []);
  return <canvas ref={ref} className="compiler-scroll-canvas" aria-hidden="true" />;
}