import {
  useAppStore,
  type DepthFuncType,
} from '@/store';
import { Slider } from './Slider';
import { TourDropdown } from './TourDropdown';

const DEPTH_FUNCS: ReadonlyArray<{ id: DepthFuncType; label: string; hint: string }> = [
  { id: 'less', label: 'LESS', hint: '标准：前面挡后面' },
  { id: 'equal', label: 'EQUAL', hint: '精确相等才通过' },
  { id: 'always', label: 'ALWAYS', hint: '从不测试：绘制顺序决定' },
];

export function DepthPanel() {
  const depth = useAppStore((s) => s.depth);
  const setDepth = useAppStore((s) => s.setDepth);

  return (
    <>
      <TourDropdown />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Depth Function
        </h2>
        <div className="space-y-1">
          {DEPTH_FUNCS.map((m) => (
            <button
              key={m.id}
              onClick={() => setDepth('depthFunc', m.id)}
              className={`flex w-full items-center justify-between rounded px-3 py-2 text-left transition ${
                depth.depthFunc === m.id
                  ? 'bg-accent/15 ring-1 ring-accent/40'
                  : 'bg-panel-light hover:bg-panel-light/70'
              }`}
            >
              <div>
                <div className="text-sm text-gray-100">{m.label}</div>
                <div className="text-[10px] text-gray-500">{m.hint}</div>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-2 rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
          切到 ALWAYS：所有像素通过测试，绘制顺序决定遮挡——立方体会"穿过"球。
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Z-Fighting 控制
        </h2>
        <div className="space-y-2">
          <Slider
            label="Polygon Offset (红色三角形)"
            value={depth.polygonOffsetFactor}
            min={-5}
            max={5}
            step={0.1}
            onChange={(v) => setDepth('polygonOffsetFactor', v)}
          />
          <Slider
            label="相机距离"
            value={depth.cameraDistance}
            min={2}
            max={25}
            step={0.1}
            onChange={(v) => setDepth('cameraDistance', v)}
          />
          <p className="rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
            offset = 0 + 远距离 → 严重闪烁；调到 +2 让红三角稳定浮到绿三角前面。
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          深度精度模式
        </h2>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center justify-between rounded bg-panel-light px-3 py-2">
            <span className="text-xs text-gray-300">显示深度缓冲（灰度图）</span>
            <input
              type="checkbox"
              checked={depth.showDepthBuffer}
              onChange={(e) => setDepth('showDepthBuffer', e.target.checked)}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded bg-panel-light px-3 py-2">
            <div>
              <div className="text-xs text-gray-300">反向 Z / logarithmic</div>
              <div className="text-[10px] text-gray-500">远距离精度大幅改善</div>
            </div>
            <input
              type="checkbox"
              checked={depth.reversedZ}
              onChange={(e) => setDepth('reversedZ', e.target.checked)}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded bg-panel-light px-3 py-2">
            <div>
              <div className="text-xs text-gray-300">depthWrite</div>
              <div className="text-[10px] text-gray-500">关闭后 mesh 不写入深度</div>
            </div>
            <input
              type="checkbox"
              checked={depth.depthWrite}
              onChange={(e) => setDepth('depthWrite', e.target.checked)}
            />
          </label>
        </div>
      </section>
    </>
  );
}
