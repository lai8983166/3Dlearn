import { useAppStore, type ShadowPcfMode, type ShadowResolution } from '@/store';
import { Slider } from './Slider';
import { TourDropdown } from './TourDropdown';

const RESOLUTIONS: readonly ShadowResolution[] = [256, 512, 1024, 2048];
const PCF_MODES: ReadonlyArray<{ id: ShadowPcfMode; label: string; description: string }> = [
  { id: 'none', label: 'None', description: '硬阴影，无滤波' },
  { id: 'pcf-1', label: '1×1', description: '单采样 PCF' },
  { id: 'pcf-3', label: '3×3', description: '软阴影，半径 2.5' },
  { id: 'pcf-5', label: '5×5', description: '更软，半径 5' },
];

export function ShadowsPanel() {
  const shadows = useAppStore((s) => s.shadows);
  const setShadows = useAppStore((s) => s.setShadows);

  return (
    <>
      <TourDropdown />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Shadow Map
        </h2>
        <div className="space-y-2">
          <div className="rounded bg-panel-light px-3 py-2">
            <div className="mb-2 text-xs text-gray-300">分辨率</div>
            <div className="grid grid-cols-4 gap-1">
              {RESOLUTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setShadows('resolution', r)}
                  className={`rounded px-2 py-1 text-xs transition ${
                    shadows.resolution === r
                      ? 'bg-accent text-panel'
                      : 'bg-panel text-gray-300 hover:bg-panel/60'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-gray-500">
              分辨率越高，阴影越细腻。256 看锯齿，2048 看平滑。
            </p>
          </div>

          <Slider
            label="Depth bias"
            value={shadows.bias}
            min={0}
            max={0.01}
            step={0.0001}
            onChange={(v) => setShadows('bias', v)}
          />
          <div className="space-y-1 rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
            <div>
              <span className="text-red-400">bias = 0</span>: shadow acne（条纹状自阴影）
            </div>
            <div>
              <span className="text-yellow-400">bias 合适</span>: acne 消失（约 0.0005–0.003）
            </div>
            <div>
              <span className="text-blue-400">bias 过大</span>: peter panning（阴影脱离物体）
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          PCF 软阴影
        </h2>
        <div className="space-y-1">
          {PCF_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setShadows('pcfMode', m.id)}
              className={`flex w-full items-center justify-between rounded px-3 py-2 text-left transition ${
                shadows.pcfMode === m.id
                  ? 'bg-accent/15 ring-1 ring-accent/40'
                  : 'bg-panel-light hover:bg-panel-light/70'
              }`}
            >
              <div>
                <div className="text-sm text-gray-100">{m.label}</div>
                <div className="text-[10px] text-gray-500">{m.description}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          光源方向
        </h2>
        <div className="space-y-2">
          <Slider
            label="Yaw（水平角度）"
            value={shadows.lightYaw}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(v) => setShadows('lightYaw', v)}
          />
          <Slider
            label="Pitch（俯仰角）"
            value={shadows.lightPitch}
            min={5}
            max={85}
            step={1}
            unit="°"
            onChange={(v) => setShadows('lightPitch', v)}
          />
          <p className="rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
            Pitch 越低，阴影越长（傍晚效果）。低角度下阴影锯齿也更明显。
          </p>
        </div>
      </section>
    </>
  );
}
