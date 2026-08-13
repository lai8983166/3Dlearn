import { useAppStore, type BrdfModelId } from '@/store';
import { Slider } from './Slider';
import { ColorInput } from './ColorInput';
import { TourDropdown } from './TourDropdown';

const SECTORS: ReadonlyArray<{ id: BrdfModelId; label: string; hint: string }> = [
  { id: 'lambert', label: '1. Lambert', hint: '纯漫反射，无高光' },
  { id: 'phong', label: '2. Phong', hint: '不守恒，R·V 高光' },
  { id: 'blinn-phong', label: '3. Blinn-Phong', hint: '半向量 N·H' },
  { id: 'ggx', label: '4. GGX', hint: '物理基，长尾' },
  { id: 'oren-nayar', label: '5. Oren-Nayar', hint: '粗糙漫反射' },
];

export function BrdfPanel() {
  const brdf = useAppStore((s) => s.brdf);
  const setBrdf = useAppStore((s) => s.setBrdf);

  return (
    <>
      <TourDropdown />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          选择扇区（点 HUD 公式）
        </h2>
        <div className="space-y-1">
          {SECTORS.map((s) => (
            <button
              key={s.id}
              onClick={() => setBrdf('selectedSector', s.id)}
              className={`flex w-full items-center justify-between rounded px-3 py-2 text-left transition ${
                brdf.selectedSector === s.id
                  ? 'bg-accent/15 ring-1 ring-accent/40'
                  : 'bg-panel-light hover:bg-panel-light/70'
              }`}
            >
              <div>
                <div className="text-sm text-gray-100">{s.label}</div>
                <div className="text-[10px] text-gray-500">{s.hint}</div>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-2 rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
          也可以直接点击 3D 视图中的扇区选中。
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          共享参数
        </h2>
        <div className="space-y-2">
          <Slider
            label="Roughness"
            value={brdf.roughness}
            min={0}
            max={1}
            step={0.02}
            onChange={(v) => setBrdf('roughness', v)}
          />
          <Slider
            label="Specular Intensity"
            value={brdf.specularIntensity}
            min={0}
            max={3}
            step={0.05}
            onChange={(v) => setBrdf('specularIntensity', v)}
          />
          <Slider
            label="Light Yaw"
            value={brdf.lightYaw}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(v) => setBrdf('lightYaw', v)}
          />
          <Slider
            label="Light Pitch"
            value={brdf.lightPitch}
            min={-20}
            max={80}
            step={1}
            unit="°"
            onChange={(v) => setBrdf('lightPitch', v)}
          />
          <ColorInput
            label="Albedo"
            value={brdf.albedo}
            onChange={(v) => setBrdf('albedo', v)}
          />
          <label className="flex cursor-pointer items-center justify-between rounded bg-panel-light px-3 py-2">
            <span className="text-xs text-gray-300">显示 cos 曲线 overlay</span>
            <input
              type="checkbox"
              checked={brdf.showCosCurve}
              onChange={(e) => setBrdf('showCosCurve', e.target.checked)}
            />
          </label>
        </div>
      </section>
    </>
  );
}
