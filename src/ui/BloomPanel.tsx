import { useAppStore, type BloomPassId } from '@/store';
import { Slider } from './Slider';
import { TourDropdown } from './TourDropdown';

const PASSES: ReadonlyArray<{ id: BloomPassId; label: string; hint: string }> = [
  { id: 'scene', label: '1. HDR Scene', hint: '渲染原始 3D 场景（半精度 RT）' },
  { id: 'bright', label: '2. Bright Pass', hint: '阈值化提取亮区' },
  { id: 'blurDown', label: '3. Blur Down', hint: '下采样 + 高斯模糊' },
  { id: 'blurUp', label: '4. Blur Up', hint: '上采样回原始分辨率' },
  { id: 'composite', label: '5. Composite', hint: '叠加 + ACES tonemap' },
];

export function BloomPanel() {
  const bloom = useAppStore((s) => s.bloom);
  const setBloom = useAppStore((s) => s.setBloom);
  const toggleBloomLayer = useAppStore((s) => s.toggleBloomLayer);

  return (
    <>
      <TourDropdown />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Pipeline Passes
        </h2>
        <div className="space-y-1">
          {PASSES.map((p) => {
            const on = bloom.layers[p.id];
            const active = bloom.activePassId === p.id;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded px-3 py-2 transition ${
                  active ? 'bg-accent/15 ring-1 ring-accent/40' : 'bg-panel-light'
                }`}
              >
                <button
                  onClick={() => toggleBloomLayer(p.id)}
                  className={`flex h-4 w-8 shrink-0 items-center rounded-full transition ${
                    on ? 'bg-accent' : 'bg-panel'
                  }`}
                  aria-label={`Toggle ${p.label}`}
                >
                  <span
                    className={`h-3 w-3 rounded-full bg-white transition ${
                      on ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <button
                  onClick={() => setBloom('activePassId', p.id)}
                  className="flex-1 text-left"
                >
                  <div className="text-sm text-gray-100">{p.label}</div>
                  <div className="text-[10px] text-gray-500">{p.hint}</div>
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-2 rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
          点 pass 名称切换 HUD 公式；点开关 toggle 该 pass。
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          参数
        </h2>
        <div className="space-y-2">
          <Slider
            label="Threshold"
            value={bloom.threshold}
            min={0}
            max={2}
            step={0.05}
            onChange={(v) => setBloom('threshold', v)}
          />
          <Slider
            label="Soft Knee"
            value={bloom.softKnee}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setBloom('softKnee', v)}
          />
          <Slider
            label="Composite Strength"
            value={bloom.compositeStrength}
            min={0}
            max={3}
            step={0.05}
            onChange={(v) => setBloom('compositeStrength', v)}
          />
          <Slider
            label="Light Intensity"
            value={bloom.lightIntensity}
            min={0.5}
            max={8}
            step={0.1}
            onChange={(v) => setBloom('lightIntensity', v)}
          />
        </div>
        <p className="mt-2 rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
          threshold &lt; 0.3 → 全图发光；composite = 0 → blur 不叠加；
          light intensity → 越亮越多像素进入 HDR 范围。
        </p>
      </section>
    </>
  );
}
