import { useMemo } from 'react';
import { RendererCanvas } from '@/three/RendererCanvas';
import { PBRExplainerModule } from '@/scenes/pbr/PBRExplainerModule';
import { useAppStore } from '@/store';
import { PbrPanel } from '@/ui/PbrPanel';

export default function App() {
  const module = useMemo(() => new PBRExplainerModule(), []);

  return (
    <div className="flex h-screen w-screen flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-panel-light bg-panel px-4">
        <h1 className="text-sm font-semibold tracking-wide">
          光学与渲染原理演示器
        </h1>
        <span className="ml-3 text-xs text-gray-400">
          Interactive Optics & Shader Explainer · PBR Module
        </span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-r border-panel-light bg-panel p-4">
          <PbrPanel />
        </aside>
        <div className="relative flex-1">
          <RendererCanvas module={module} moduleKey="pbr" />
        </div>
      </div>
    </div>
  );
}

// Re-export for tests / future modules
export { useAppStore };
