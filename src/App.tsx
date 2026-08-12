import { useMemo } from 'react';
import { RendererCanvas } from '@/three/RendererCanvas';
import { PlaceholderModule } from '@/scenes/placeholder/PlaceholderModule';

export default function App() {
  const module = useMemo(() => new PlaceholderModule(), []);

  return (
    <div className="flex h-screen w-screen flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-panel-light bg-panel px-4">
        <h1 className="text-sm font-semibold tracking-wide">
          光学与渲染原理演示器
        </h1>
        <span className="ml-3 text-xs text-gray-400">
          Interactive Optics & Shader Explainer
        </span>
      </header>
      <div className="relative flex-1">
        <RendererCanvas module={module} moduleKey="placeholder" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="bg-panel/80 rounded px-3 py-1 text-xs text-gray-300">
            Scaffold OK — PBR scene coming next
          </p>
        </div>
      </div>
    </div>
  );
}
