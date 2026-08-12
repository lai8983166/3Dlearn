import { useEffect, useRef } from 'react';
import { SceneManager } from './SceneManager';
import type { SceneModule } from './SceneModule';

interface RendererCanvasProps {
  module: SceneModule;
  /** Bumped to force a module swap even if the reference is the same. */
  moduleKey: string;
}

/**
 * Mounts a SceneManager into a canvas ref and handles the React 18 StrictMode
 * double-invoke of useEffect by disposing on cleanup. Resizes are observed
 * via ResizeObserver so the canvas fills its parent regardless of layout.
 */
export function RendererCanvas({ module, moduleKey }: RendererCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const moduleRef = useRef<SceneModule>(module);

  // Keep the latest module reference without re-running the mount effect.
  moduleRef.current = module;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const manager = new SceneManager(canvas);
    managerRef.current = manager;
    manager.setModule(moduleRef.current);
    manager.start();

    const parent = canvas.parentElement;
    const resizeObserver = parent
      ? new ResizeObserver((entries) => {
          const entry = entries[0];
          if (!entry) return;
          const { width, height } = entry.contentRect;
          manager.setSize(width, height);
        })
      : null;
    resizeObserver?.observe(parent!);

    // Initial size after layout settles.
    requestAnimationFrame(() => {
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      manager.setSize(rect.width, rect.height);
    });

    return () => {
      resizeObserver?.disconnect();
      manager.dispose();
      managerRef.current = null;
    };
  }, []);

  // Swap the active module when moduleKey changes (do not re-create renderer).
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.setModule(module);
  }, [moduleKey, module]);

  return <canvas ref={canvasRef} className="block h-full w-full" />;
}
