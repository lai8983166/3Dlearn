interface ColorInputProps {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function ColorInput({
  label,
  value,
  disabled,
  onChange,
}: ColorInputProps) {
  return (
    <label
      className={`flex items-center justify-between rounded bg-panel-light px-3 py-2 ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <span className="text-xs text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase text-gray-400">
          {value}
        </span>
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-10 cursor-pointer rounded border-none bg-transparent"
        />
      </div>
    </label>
  );
}
