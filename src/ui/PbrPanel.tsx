import { useAppStore } from '@/store';
import { LayerToggle } from './LayerToggle';
import { Slider } from './Slider';
import { ColorInput } from './ColorInput';
import { HdriPicker } from './HdriPicker';
import { TourDropdown } from './TourDropdown';

export function PbrPanel() {
  const pbr = useAppStore((s) => s.pbr);
  const setPbr = useAppStore((s) => s.setPbr);
  const toggleLayer = useAppStore((s) => s.toggleLayer);

  const isGgx = pbr.specularModel === 'ggx';

  return (
    <>
      <TourDropdown />
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Layers
        </h2>
        <div className="space-y-2">
          <LayerToggle
            label="Diffuse"
            description="Lambertian base color"
            checked={pbr.layers.diffuse}
            onChange={() => toggleLayer('diffuse')}
          />
          <LayerToggle
            label="Specular"
            description={isGgx ? 'GGX microfacet BRDF' : 'Blinn-Phong'}
            checked={pbr.layers.specular}
            onChange={() => toggleLayer('specular')}
          />
          <LayerToggle
            label="Normal Map"
            description={`Preset: ${pbr.normalMapPreset}`}
            checked={pbr.layers.normal}
            onChange={() => toggleLayer('normal')}
          />
          <LayerToggle
            label="Env Reflection"
            description="Fresnel-modulated HDRI"
            checked={pbr.layers.env}
            onChange={() => toggleLayer('env')}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Diffuse
        </h2>
        <div className="space-y-2">
          <ColorInput
            label="Base color"
            value={pbr.diffuseColor}
            disabled={!pbr.layers.diffuse}
            onChange={(v) => setPbr('diffuseColor', v)}
          />
          <Slider
            label="Intensity"
            value={pbr.diffuseIntensity}
            min={0}
            max={2}
            disabled={!pbr.layers.diffuse}
            onChange={(v) => setPbr('diffuseIntensity', v)}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Specular
        </h2>
        <div className="space-y-2">
          <div className="flex gap-1 rounded bg-panel-light p-1">
            {(['ggx', 'blinn-phong'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPbr('specularModel', m)}
                className={`flex-1 rounded px-2 py-1 text-xs transition ${
                  pbr.specularModel === m
                    ? 'bg-accent text-panel'
                    : 'text-gray-300 hover:bg-panel'
                }`}
              >
                {m === 'ggx' ? 'GGX (PBR)' : 'Blinn-Phong'}
              </button>
            ))}
          </div>
          {!isGgx && (
            <ColorInput
              label="Specular color"
              value={pbr.specularColor}
              disabled={!pbr.layers.specular}
              onChange={(v) => setPbr('specularColor', v)}
            />
          )}
          <Slider
            label="Intensity"
            value={pbr.specularIntensity}
            min={0}
            max={5}
            disabled={!pbr.layers.specular}
            onChange={(v) => setPbr('specularIntensity', v)}
          />
          {isGgx ? (
            <Slider
              label="Roughness"
              value={pbr.roughness}
              min={0}
              max={1}
              disabled={!pbr.layers.specular}
              onChange={(v) => setPbr('roughness', v)}
            />
          ) : (
            <Slider
              label="Shininess"
              value={pbr.shininess}
              min={1}
              max={256}
              step={1}
              disabled={!pbr.layers.specular}
              onChange={(v) => setPbr('shininess', v)}
            />
          )}
          {isGgx && (
            <Slider
              label="Metalness"
              value={pbr.metalness}
              min={0}
              max={1}
              onChange={(v) => setPbr('metalness', v)}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Normal Map Preset
        </h2>
        <div className="flex gap-1 rounded bg-panel-light p-1">
          {(['smooth', 'bricks', 'hammered'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPbr('normalMapPreset', p)}
              className={`flex-1 rounded px-2 py-1 text-xs capitalize transition ${
                pbr.normalMapPreset === p
                  ? 'bg-accent text-panel'
                  : 'text-gray-300 hover:bg-panel'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        {!pbr.layers.normal && (
          <p className="mt-2 text-[10px] text-gray-500">
            Enable the Normal Map layer to see the perturbation.
          </p>
        )}
      </section>

      <HdriPicker />
    </>
  );
}
