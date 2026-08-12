import { useMemo } from 'react';
import { RendererCanvas } from '@/three/RendererCanvas';
import { PBRExplainerModule } from '@/scenes/pbr/PBRExplainerModule';
import { useAppStore } from '@/store';

export default function App() {
  const module = useMemo(() => new PBRExplainerModule(), []);

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
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-panel-light bg-panel p-4">
          <LayersSection />
        </aside>
        <div className="relative flex-1">
          <RendererCanvas module={module} moduleKey="pbr" />
        </div>
      </div>
    </div>
  );
}

function LayersSection() {
  const layers = useAppStore((s) => s.pbr.layers);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Layers
      </h2>
      <div className="space-y-2">
        {(
          [
            ['diffuse', 'Diffuse (Lambertian)'],
            ['specular', 'Specular (highlight)'],
            ['normal', 'Normal Map'],
            ['env', 'Env Reflection (Fresnel)'],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className="flex cursor-pointer items-center justify-between rounded bg-panel-light px-3 py-2"
          >
            <span className="text-sm">{label}</span>
            <span className="layer-toggle">
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={() => toggleLayer(key)}
              />
              <span className="slider" />
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
