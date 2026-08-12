import { useAppStore, defaultFocalLength } from '@/store';
import { Slider } from './Slider';
import { computeThinLensImaging } from '@/physics/optics';

export function OpticsPanel() {
  const optics = useAppStore((s) => s.optics);
  const setOptics = useAppStore((s) => s.setOptics);

  const onLensTypeChange = (lensType: typeof optics.lensType) => {
    setOptics('lensType', lensType);
    setOptics('focalLength', defaultFocalLength(lensType));
  };

  return (
    <>
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Lens
        </h2>
        <div className="grid grid-cols-2 gap-1 rounded bg-panel-light p-1">
          {(
            [
              ['biconvex', '双凸 Biconvex'],
              ['planoconvex', '平凸 Planoconvex'],
              ['biconcave', '双凹 Biconcave'],
              ['planoconcave', '平凹 Planoconcave'],
            ] as const
          ).map(([type, label]) => (
            <button
              key={type}
              onClick={() => onLensTypeChange(type)}
              className={`rounded px-2 py-1.5 text-xs transition ${
                optics.lensType === type
                  ? 'bg-accent text-panel'
                  : 'text-gray-300 hover:bg-panel'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <Slider
            label="Focal length f"
            value={optics.focalLength}
            min={-5}
            max={5}
            step={0.1}
            unit="u"
            onChange={(v) => setOptics('focalLength', v)}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Object
        </h2>
        <div className="space-y-2">
          <Slider
            label="Object x-position"
            value={optics.objectX}
            min={-10}
            max={-0.5}
            step={0.05}
            unit="u"
            onChange={(v) => setOptics('objectX', v)}
          />
          <Slider
            label="Object height"
            value={optics.objectHeight}
            min={0.1}
            max={2}
            step={0.05}
            unit="u"
            onChange={(v) => setOptics('objectHeight', v)}
          />
        </div>
        <p className="mt-2 text-[10px] text-gray-500">
          Tip: drag the orange arrow directly in the view.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Light Source
        </h2>
        <div className="flex gap-1 rounded bg-panel-light p-1">
          {(
            [
              ['parallel', '平行光 Parallel'],
              ['point', '点光源 Point (from arrow tip)'],
            ] as const
          ).map(([type, label]) => (
            <button
              key={type}
              onClick={() => setOptics('lightSourceType', type)}
              className={`flex-1 rounded px-2 py-1.5 text-xs transition ${
                optics.lightSourceType === type
                  ? 'bg-accent text-panel'
                  : 'text-gray-300 hover:bg-panel'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <Slider
            label="Ray count"
            value={optics.rayCount}
            min={3}
            max={21}
            step={2}
            onChange={(v) => setOptics('rayCount', Math.round(v))}
          />
        </div>
      </section>

      <OpticsReadout />
    </>
  );
}

function OpticsReadout() {
  const { focalLength: f, objectX: u } = useAppStore((s) => s.optics);
  const imaging = computeThinLensImaging(u, f);

  const vDisplay = Number.isFinite(imaging.v)
    ? `${imaging.v >= 0 ? '+' : ''}${(imaging.v / Math.abs(f)).toFixed(2)}f`
    : '∞';

  const uDisplay = `${(Math.abs(u) / Math.abs(f)).toFixed(2)}f`;
  const mDisplay = Number.isFinite(imaging.magnification)
    ? imaging.magnification.toFixed(2)
    : '∞';

  const orientation = imaging.isUpright ? '直立 upright' : '倒立 inverted';
  const size =
    Math.abs(imaging.magnification) > 1.01
      ? '放大 enlarged'
      : Math.abs(imaging.magnification) < 0.99
      ? '缩小 diminished'
      : '等大 same-size';

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Imaging
      </h2>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Row label="Object distance u" value={uDisplay} />
        <Row label="Image distance v" value={vDisplay} />
        <Row label="Magnification m" value={mDisplay} />
        <Row
          label="Image type"
          value={
            Number.isFinite(imaging.v)
              ? imaging.isReal
                ? '实像 real'
                : '虚像 virtual'
              : '— (infinity)'
          }
          highlight={imaging.isReal ? 'real' : 'virtual'}
        />
        <Row label="Orientation" value={orientation} />
        <Row label="Size" value={size} />
      </div>
      <p className="mt-3 rounded bg-panel-light px-2 py-2 text-[10px] leading-relaxed text-gray-400">
        Cartesian sign convention · 1/v − 1/u = 1/f · m = v/u.
        Teaching approximation: paraxial rays, thin lens.
      </p>
    </section>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'real' | 'virtual';
}) {
  const valueColor =
    highlight === 'real'
      ? 'text-emerald-400'
      : highlight === 'virtual'
      ? 'text-purple-400'
      : 'text-accent';
  return (
    <div className="rounded bg-panel-light px-2 py-1.5">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className={`font-mono ${valueColor}`}>{value}</div>
    </div>
  );
}
