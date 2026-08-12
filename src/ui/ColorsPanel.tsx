import { useAppStore, type ToneMappingType } from '@/store';
import { Slider } from './Slider';
import { TourDropdown } from './TourDropdown';

const TONEMAPS: ReadonlyArray<{
  id: ToneMappingType;
  label: string;
  formula: string;
}> = [
  { id: 'none', label: 'None', formula: 'clip(x, 0, 1)' },
  { id: 'reinhard', label: 'Reinhard', formula: 'x / (x + 1)' },
  { id: 'aces', label: 'ACES Filmic', formula: '(x·(ax+b))/(x·(cx+d)+e)' },
];

export function ColorsPanel() {
  const colors = useAppStore((s) => s.colors);
  const setColors = useAppStore((s) => s.setColors);

  const pipeline = buildPipelineSummary(colors);

  return (
    <>
      <TourDropdown />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Tone Mapping
        </h2>
        <div className="space-y-1">
          {TONEMAPS.map((m) => (
            <button
              key={m.id}
              onClick={() => setColors('toneMapping', m.id)}
              className={`flex w-full items-center justify-between rounded px-3 py-2 text-left transition ${
                colors.toneMapping === m.id
                  ? 'bg-accent/15 ring-1 ring-accent/40'
                  : 'bg-panel-light hover:bg-panel-light/70'
              }`}
            >
              <div>
                <div className="text-sm text-gray-100">{m.label}</div>
                <div className="font-mono text-[10px] text-gray-500">{m.formula}</div>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-2 rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
          None = 高光直接 clip 到 1.0（烧死）；Reinhard = 简单 x/(x+1)；
          ACES = 电影行业标准，高光保留细节，整体偏暖。
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          曝光
        </h2>
        <Slider
          label="Exposure"
          value={colors.exposure}
          min={-2}
          max={2}
          step={0.05}
          unit=" stops"
          onChange={(v) => setColors('exposure', v)}
        />
        <p className="mt-2 rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
          像相机光圈：每 +1 stop 光线翻倍，每 -1 stop 减半。乘数 = 2^exposure。
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          输出色彩空间
        </h2>
        <label className="flex cursor-pointer items-center justify-between rounded bg-panel-light px-3 py-2">
          <div>
            <div className="text-sm">sRGB 输出（gamma 校正）</div>
            <div className="text-[10px] text-gray-500">
              关掉看错误的 Linear 直接输出（整体偏暗）
            </div>
          </div>
          <span className="layer-toggle">
            <input
              type="checkbox"
              checked={colors.gammaCorrect}
              onChange={(e) => setColors('gammaCorrect', e.target.checked)}
            />
            <span className="slider" />
          </span>
        </label>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          HDR 可视化
        </h2>
        <label className="flex cursor-pointer items-center justify-between rounded bg-panel-light px-3 py-2">
          <div>
            <div className="text-sm">显示被 clip 的像素</div>
            <div className="font-mono text-[10px] text-magenta-400 text-fuchsia-400">
              超过 1.0 的 HDR 像素 → 洋红色覆盖
            </div>
          </div>
          <span className="layer-toggle">
            <input
              type="checkbox"
              checked={colors.showClipping}
              onChange={(e) => setColors('showClipping', e.target.checked)}
            />
            <span className="slider" />
          </span>
        </label>
      </section>

      <section className="rounded bg-panel-light p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-dim">
          当前 Pipeline
        </div>
        <div className="space-y-1 font-mono text-[11px] leading-relaxed text-gray-200">
          {pipeline.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-accent">{i + 1}.</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function buildPipelineSummary(c: {
  toneMapping: ToneMappingType;
  gammaCorrect: boolean;
}): string[] {
  const tonemapLabel =
    c.toneMapping === 'none'
      ? 'No tonemap (HDR)'
      : c.toneMapping === 'reinhard'
      ? 'Reinhard tonemap'
      : 'ACES Filmic tonemap';
  const outputLabel = c.gammaCorrect ? 'sRGB output ✓' : '⚠ Linear output (uncorrected)';

  return [
    'Linear scene render',
    `${tonemapLabel} → compress HDR into [0,1]`,
    outputLabel,
  ];
}
