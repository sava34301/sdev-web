import { useEffect, useRef } from 'react';
import type { JourneyScene } from './journeyScene';

type Props = {
  /** Receives the live scene so the page's single scroll listener can drive it. */
  onReady: (scene: JourneyScene | null) => void;
};

/**
 * Lazily boots the WebGL compiler flight. The heavy 3D code is loaded only after the
 * page has painted, renders only while on screen, and is skipped for reduced motion.
 */
export function JourneyCanvas({ onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let scene: JourneyScene | null = null;
    let disposed = false;
    let visible = true;
    let io: IntersectionObserver | undefined;
    let ro: ResizeObserver | undefined;

    const sync = () => {
      if (!scene) return;
      if (visible && document.visibilityState === 'visible') scene.start();
      else scene.stop();
    };
    const onPointer = (e: PointerEvent) => {
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };

    import('./journeyScene').then(({ JourneyScene }) => {
      if (disposed) return;
      try {
        scene = new JourneyScene(canvas, window.innerWidth < 768);
      } catch {
        return; // no WebGL: the chapters still read fine over the static backdrop
      }
      canvas.classList.add('is-ready');
      onReady(scene);
      ro = new ResizeObserver(() => scene?.resize());
      ro.observe(canvas);
      io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
      io.observe(canvas);
      document.addEventListener('visibilitychange', sync);
      window.addEventListener('pointermove', onPointer, { passive: true });
      sync();
    });

    return () => {
      disposed = true;
      io?.disconnect();
      ro?.disconnect();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pointermove', onPointer);
      onReady(null);
      scene?.dispose();
    };
  }, [onReady]);

  return <canvas ref={canvasRef} className="journey-canvas" aria-hidden="true" />;
}
