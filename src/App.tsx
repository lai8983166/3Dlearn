import { useEffect, useMemo } from 'react';
import { RendererCanvas } from '@/three/RendererCanvas';
import { PBRExplainerModule } from '@/scenes/pbr/PBRExplainerModule';
import { OpticsModule } from '@/scenes/optics/OpticsModule';
import { PbrPanel } from '@/ui/PbrPanel';
import { OpticsPanel } from '@/ui/OpticsPanel';
import { FormulaHud } from '@/ui/FormulaHud';
import { EnvironmentGuards } from '@/ui/ErrorBoundaries';
import { useAppStore } from '@/store';
import type { SceneModule } from '@/three/SceneModule';
import type { ModuleId } from '@/store';

export default function App() {
  const activeModule = useAppStore((s) => s.activeModule);
  const setModule = useAppStore((s) => s.setModule);

  // Module instances are created on demand and replaced when the user
  // switches Tabs. RendererCanvas's moduleKey effect disposes the old
  // module's GPU resources before initialising the new one.
  const module = useMemo<SceneModule>(() => createModule(activeModule), [activeModule]);

  // Sanity log on module switch (visible in devtools console).
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`[3DLearn] active module → ${activeModule}`);
    }
  }, [activeModule]);

  return (
    <EnvironmentGuards>
      <div className="flex h-screen w-screen flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-panel-light bg-panel px-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-sm font-semibold tracking-wide">
              光学与渲染原理演示器
            </h1>
            <span className="text-xs text-gray-400">
              Interactive Optics & Shader Explainer
            </span>
          </div>
          <nav className="flex gap-1 rounded bg-panel-light p-1">
            {(
              [
                ['pbr', 'PBR Shader 拆解器'],
                ['optics', '几何光学沙盒'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setModule(id)}
                className={`rounded px-3 py-1 text-xs transition ${
                  activeModule === id
                    ? 'bg-accent text-panel'
                    : 'text-gray-300 hover:bg-panel'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <aside className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto border-r border-panel-light bg-panel p-4">
            {activeModule === 'pbr' ? (
              <>
                <PbrPanel />
                <FormulaHud />
              </>
            ) : (
              <OpticsPanel />
            )}
          </aside>
          <div className="relative flex-1">
            <RendererCanvas module={module} moduleKey={activeModule} />
          </div>
        </div>
      </div>
    </EnvironmentGuards>
  );
}

function createModule(id: ModuleId): SceneModule {
  switch (id) {
    case 'pbr':
      return new PBRExplainerModule();
    case 'optics':
      return new OpticsModule();
  }
}
