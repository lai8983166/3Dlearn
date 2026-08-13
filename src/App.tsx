import { useEffect, useMemo, useState } from 'react';
import { RendererCanvas } from '@/three/RendererCanvas';
import { PBRExplainerModule } from '@/scenes/pbr/PBRExplainerModule';
import { OpticsModule } from '@/scenes/optics/OpticsModule';
import { ShadowModule } from '@/scenes/shadows/ShadowModule';
import { TextureModule } from '@/scenes/textures/TextureModule';
import { TransformModule } from '@/scenes/transforms/TransformModule';
import { ColorModule } from '@/scenes/colors/ColorModule';
import { DepthModule } from '@/scenes/depth/DepthModule';
import { BloomModule } from '@/scenes/bloom/BloomModule';
import { BrdfModule } from '@/scenes/brdf/BrdfModule';
import { PbrPanel } from '@/ui/PbrPanel';
import { OpticsPanel } from '@/ui/OpticsPanel';
import { ShadowsPanel } from '@/ui/ShadowsPanel';
import { TexturesPanel } from '@/ui/TexturesPanel';
import { TransformsPanel } from '@/ui/TransformsPanel';
import { ColorsPanel } from '@/ui/ColorsPanel';
import { DepthPanel } from '@/ui/DepthPanel';
import { BloomPanel } from '@/ui/BloomPanel';
import { BrdfPanel } from '@/ui/BrdfPanel';
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
  const [isWide, setIsWide] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : true,
  );

  // Module instances are created on demand and replaced when the user
  // switches Tabs. RendererCanvas's moduleKey effect disposes the old
  // module's GPU resources before initialising the new one.
  const module = useMemo<SceneModule>(() => createModule(activeModule), [activeModule]);

  // Track viewport width so the tab bar collapses to a dropdown under 1280px.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const onChange = () => setIsWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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
              {isWide ? (
                MODULE_TABS.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setModule(id)}
                    className={`rounded px-2.5 py-1 text-xs transition ${
                      activeModule === id
                        ? 'bg-accent text-panel'
                        : 'text-gray-300 hover:bg-panel'
                    }`}
                  >
                    {label}
                  </button>
                ))
              ) : (
                <select
                  value={activeModule}
                  onChange={(e) => setModule(e.target.value as ModuleId)}
                  className="rounded bg-panel px-2 py-1 text-xs text-gray-100"
                >
                  {MODULE_TABS.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
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
            {activeModule === 'colors' && <ColorsPanel />}
            {activeModule === 'depth' && (
              <>
                <DepthPanel />
                <FormulaHud />
              </>
            )}
            {activeModule === 'bloom' && (
              <>
                <BloomPanel />
                <FormulaHud />
              </>
            )}
            {activeModule === 'brdf' && (
              <>
                <BrdfPanel />
                <FormulaHud />
              </>
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

const MODULE_TABS: ReadonlyArray<[ModuleId, string]> = [
  ['pbr', 'PBR'],
  ['optics', '光学'],
  ['shadows', '阴影'],
  ['textures', '纹理'],
  ['transforms', '变换'],
  ['colors', '色彩'],
  ['depth', '深度'],
  ['bloom', 'Bloom'],
  ['brdf', 'BRDF'],
];

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
      return new ColorModule();
    case 'depth':
      return new DepthModule();
    case 'bloom':
      return new BloomModule();
    case 'brdf':
      return new BrdfModule();
  }
}
