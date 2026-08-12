interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  unit,
  disabled,
  onChange,
}: SliderProps) {
  return (
    <label
      className={`block rounded bg-panel-light px-3 py-2 ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-gray-300">{label}</span>
        <span className="font-mono text-xs text-accent">
          {value.toFixed(2)}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}
