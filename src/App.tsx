import { useEffect, useMemo, useState } from 'react';
import { RendererCanvas } from '@/three/RendererCanvas';
import { PBRExplainerModule } from '@/scenes/pbr/PBRExplainerModule';
import { OpticsModule } from '@/scenes/optics/OpticsModule';
import { ShadowModule } from '@/scenes/shadows/ShadowModule';
import { TextureModule } from '@/scenes/textures/TextureModule';
import { TransformModule } from '@/scenes/transforms/TransformModule';
import { PbrPanel } from '@/ui/PbrPanel';
import { OpticsPanel } from '@/ui/OpticsPanel';
import { ShadowsPanel } from '@/ui/ShadowsPanel';
import { TexturesPanel } from '@/ui/TexturesPanel';
import { TransformsPanel } from '@/ui/TransformsPanel';
import { FormulaHud } from '@/ui/FormulaHud';
import { EnvironmentGuards } from '@/ui/ErrorBoundaries';
import { HelpModal } from '@/ui/HelpModal';
import { TourOverlay } from '@/ui/TourOverlay';
import { HintToast } from '@/ui/Hint';
import { tourRunner } from '@/tours/runner';
import { getHintController } from '@/hints/trigger';
import { useAppStore } from '@/store';
import type { SceneModule } from '@/three/SceneModule';
import type { ModuleId } from '@/store';

export default function App() {
  const activeModule = useAppStore((s) => s.activeModule);
  const setModule = useAppStore((s) => s.setModule);
  const [helpOpen, setHelpOpen] = useState(false);

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

  // Single Esc handler with priority: help > tour > hint.
  // Avoids the multiple-handlers-firing problem when several teaching
  // elements coexist; only the topmost wins.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const kind = useAppStore.getState().activeInterruption.kind;
      if (kind === 'help') {
        setHelpOpen(false);
      } else if (kind === 'tour') {
        tourRunner.skip();
      } else if (kind === 'hint') {
        getHintController().dismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
          <div className="flex items-center gap-2">
            <nav className="flex gap-1 rounded bg-panel-light p-1">
              {(
                [
                  ['pbr', 'PBR'],
                  ['optics', '光学'],
                  ['shadows', '阴影'],
                  ['textures', '纹理'],
                  ['transforms', '变换'],
                  ['colors', '色彩'],
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
            <button
              onClick={() => setHelpOpen(true)}
              aria-label="打开帮助"
              title="帮助 (Help)"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-panel-light bg-panel-light text-xs text-gray-300 transition hover:bg-panel hover:text-white"
            >
              ?
            </button>
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <aside className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto border-r border-panel-light bg-panel p-4">
            {activeModule === 'pbr' && (
              <>
                <PbrPanel />
                <FormulaHud />
              </>
            )}
            {activeModule === 'optics' && <OpticsPanel />}
            {activeModule === 'shadows' && <ShadowsPanel />}
            {activeModule === 'textures' && <TexturesPanel />}
            {activeModule === 'transforms' && <TransformsPanel />}
            {activeModule === 'colors' && (
              <div className="rounded bg-panel-light p-3 text-xs text-gray-400">
                色彩模块将在 Phase 2 接入。
              </div>
            )}
          </aside>
          <div className="relative flex-1">
            <RendererCanvas module={module} moduleKey={activeModule} />
            <TourOverlay />
            <HintToast />
          </div>
        </div>
      </div>
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </EnvironmentGuards>
  );
}

function createModule(id: ModuleId): SceneModule {
  switch (id) {
    case 'pbr':
      return new PBRExplainerModule();
    case 'optics':
      return new OpticsModule();
    case 'shadows':
      return new ShadowModule();
    case 'textures':
      return new TextureModule();
    case 'transforms':
      return new TransformModule();
    case 'colors':
      throw new Error('colors module not yet implemented');
  }
}
