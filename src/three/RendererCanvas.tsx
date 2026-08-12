import { useEffect, useRef } from 'react';
import { SceneManager } from './SceneManager';
import type { SceneModule } from './SceneModule';

interface RendererCanvasProps {
  module: SceneModule;
  /** Bumped to force a module swap even if the reference is the same. */
  moduleKey: string;
}

/**
 * Mounts a SceneManager into a canvas and handles the React 18 StrictMode
 * double-invoke of useEffect.
 *
 * StrictMode (in dev) mounts, unmounts, then re-mounts the same component
 * to surface side-effect bugs. Our cleanup calls `renderer.forceContextLoss()`
 * to release GPU resources — that leaves the canvas's WebGL context in a
 * "lost" state. A subsequent `new WebGLRenderer({ canvas })` on the *same*
 * canvas would inherit that lost context and crash inside Three.js's
 * capability detection.
 *
 * The fix is to create a brand-new <canvas> element on every mount. The
 * old canvas + its (lost) context are GC'd together; the new canvas gets a
 * fresh context with full capabilities.
 *
 * Resizes are observed via ResizeObserver so the canvas fills its parent
 * regardless of layout.
 */
export function RendererCanvas({ module, moduleKey }: RendererCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const moduleRef = useRef<SceneModule>(module);

  // Keep the latest module reference without re-running the mount effect.
  moduleRef.current = module;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'renderer-canvas';
    container.appendChild(canvas);

    const manager = new SceneManager(canvas);
    managerRef.current = manager;
    manager.setModule(moduleRef.current);
    manager.start();

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      manager.setSize(width, height);
    });
    resizeObserver.observe(container);

    requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      manager.setSize(rect.width, rect.height);
    });

    return () => {
      resizeObserver.disconnect();
      manager.dispose();
      managerRef.current = null;
      // Remove the canvas so the next mount starts completely fresh.
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  // Swap the active module when moduleKey changes (do not re-create renderer).
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.setModule(module);
  }, [moduleKey, module]);

  return <div ref={containerRef} className="block h-full w-full" />;
}
