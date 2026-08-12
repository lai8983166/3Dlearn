import {
  useAppStore,
  type TextureFilterMode,
  type TextureWrapping,
} from '@/store';
import { Slider } from './Slider';
import { TourDropdown } from './TourDropdown';

const FILTER_MODES: ReadonlyArray<{
  id: TextureFilterMode;
  label: string;
  hint: string;
}> = [
  { id: 'nearest', label: 'Nearest', hint: '像素风、有锯齿' },
  { id: 'linear', label: 'Linear', hint: '双线性、平滑' },
  { id: 'mipmap-nearest', label: 'Mipmap N', hint: 'Mipmap + 最近' },
  { id: 'mipmap-linear', label: 'Mipmap L', hint: 'Mipmap + 线性（远处不闪）' },
];

const WRAPPINGS: ReadonlyArray<{ id: TextureWrapping; label: string; hint: string }> = [
  { id: 'repeat', label: 'Repeat', hint: '整块重复' },
  { id: 'mirror', label: 'Mirror', hint: '相邻 tile 翻转' },
  { id: 'clamp', label: 'Clamp', hint: '边缘拉伸' },
];

export function TexturesPanel() {
  const textures = useAppStore((s) => s.textures);
  const setTextures = useAppStore((s) => s.setTextures);

  return (
    <>
      <TourDropdown />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          过滤模式
        </h2>
        <div className="space-y-1">
          {FILTER_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setTextures('filterMode', m.id)}
              className={`flex w-full items-center justify-between rounded px-3 py-2 text-left transition ${
                textures.filterMode === m.id
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
          斜视角看远处：Nearest 出现 moiré 闪烁，Mipmap 让远处平滑。
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Anisotropic
        </h2>
        <Slider
          label="各向异性等级"
          value={textures.anisotropy}
          min={1}
          max={16}
          step={1}
          onChange={(v) => setTextures('anisotropy', Math.round(v))}
        />
        <p className="mt-2 rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
          斜视角下，1 = 远处模糊，16 = 远处依然清晰。GPU 实际支持的最大值会在初始化时自动限定。
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Wrapping
        </h2>
        <div className="grid grid-cols-3 gap-1">
          {WRAPPINGS.map((w) => (
            <button
              key={w.id}
              onClick={() => setTextures('wrapping', w.id)}
              className={`rounded px-2 py-2 text-xs transition ${
                textures.wrapping === w.id
                  ? 'bg-accent text-panel'
                  : 'bg-panel-light text-gray-300 hover:bg-panel-light/70'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
        <p className="mt-2 rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
          tiling &gt; 1 时最明显：Repeat 整块复制、Mirror 每 two tile 翻转、Clamp 拉伸边缘。
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          UV
        </h2>
        <div className="space-y-2">
          <Slider
            label="Tiling（重复次数）"
            value={textures.tiling}
            min={1}
            max={8}
            step={1}
            onChange={(v) => setTextures('tiling', Math.round(v))}
          />
          <Slider
            label="Offset"
            value={textures.offset}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setTextures('offset', v)}
          />
          <Slider
            label="Checker 单元数"
            value={textures.checkerCells}
            min={2}
            max={16}
            step={1}
            onChange={(v) => setTextures('checkerCells', Math.round(v))}
          />
          <label className="flex cursor-pointer items-center justify-between rounded bg-panel-light px-3 py-2">
            <span className="text-sm">显示 UV 网格</span>
            <span className="layer-toggle">
              <input
                type="checkbox"
                checked={textures.showUvGrid}
                onChange={(e) => setTextures('showUvGrid', e.target.checked)}
              />
              <span className="slider" />
            </span>
          </label>
        </div>
      </section>
    </>
  );
}
