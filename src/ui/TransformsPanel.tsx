import { useAppStore, type TransformOrder } from '@/store';
import { Slider } from './Slider';
import { TourDropdown } from './TourDropdown';
import { MatrixView } from './MatrixView';

const ORDERS: readonly TransformOrder[] = [
  'TRS',
  'TSR',
  'RTS',
  'RST',
  'STR',
  'SRT',
];

const AXES = ['X', 'Y', 'Z'] as const;

export function TransformsPanel() {
  const transforms = useAppStore((s) => s.transforms);
  const setTransforms = useAppStore((s) => s.setTransforms);

  const setAxis = (
    kind: 'translate' | 'rotate' | 'scale',
    axis: 0 | 1 | 2,
    value: number,
  ) => {
    const next = [...transforms[kind]] as [number, number, number];
    next[axis] = value;
    setTransforms(kind, next);
  };

  const reset = () => {
    setTransforms('translate', [0, 0, 0]);
    setTransforms('rotate', [0, 0, 0]);
    setTransforms('scale', [1, 1, 1]);
    setTransforms('order', 'TRS');
  };

  return (
    <>
      <TourDropdown />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Translate
          </h2>
          <span className="font-mono text-[10px] text-gray-500">T (post-multiply)</span>
        </div>
        <div className="space-y-2">
          {AXES.map((axis, i) => (
            <Slider
              key={`t-${axis}`}
              label={`Translate ${axis}`}
              value={transforms.translate[i]}
              min={-3}
              max={3}
              step={0.05}
              unit="u"
              onChange={(v) => setAxis('translate', i as 0 | 1 | 2, v)}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Rotate
          </h2>
          <span className="font-mono text-[10px] text-gray-500">Euler XYZ (degrees)</span>
        </div>
        <div className="space-y-2">
          {AXES.map((axis, i) => (
            <Slider
              key={`r-${axis}`}
              label={`Rotate ${axis}`}
              value={transforms.rotate[i]}
              min={0}
              max={360}
              step={1}
              unit="°"
              onChange={(v) => setAxis('rotate', i as 0 | 1 | 2, v)}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Scale
          </h2>
          <span className="font-mono text-[10px] text-gray-500">Per-axis multiplier</span>
        </div>
        <div className="space-y-2">
          {AXES.map((axis, i) => (
            <Slider
              key={`s-${axis}`}
              label={`Scale ${axis}`}
              value={transforms.scale[i]}
              min={-2}
              max={3}
              step={0.05}
              unit="×"
              onChange={(v) => setAxis('scale', i as 0 | 1 | 2, v)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          乘法顺序
        </h2>
        <div className="grid grid-cols-3 gap-1 rounded bg-panel-light p-1">
          {ORDERS.map((o) => (
            <button
              key={o}
              onClick={() => setTransforms('order', o)}
              className={`rounded px-2 py-1.5 text-xs font-mono transition ${
                transforms.order === o
                  ? 'bg-accent text-panel'
                  : 'bg-panel text-gray-300 hover:bg-panel/60'
              }`}
            >
              {o}
            </button>
          ))}
        </div>
        <p className="mt-2 rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
          矩阵乘法不可交换。T·R ≠ R·T —— 切换顺序看 F 姿态和矩阵都变。
        </p>
      </section>

      <section>
        <button
          onClick={reset}
          className="w-full rounded border border-panel-light bg-panel px-3 py-2 text-xs text-gray-300 transition hover:bg-panel-light hover:text-white"
        >
          ↺ 重置到默认（T=0, R=0, S=1, TRS）
        </button>
      </section>

      <MatrixView state={transforms} />
    </>
  );
}
