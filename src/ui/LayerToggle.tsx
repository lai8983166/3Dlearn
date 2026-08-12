interface LayerToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function LayerToggle({
  label,
  description,
  checked,
  onChange,
}: LayerToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded bg-panel-light px-3 py-2">
      <div className="flex flex-col">
        <span className="text-sm">{label}</span>
        {description && (
          <span className="text-[10px] text-gray-500">{description}</span>
        )}
      </div>
      <span className="layer-toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="slider" />
      </span>
    </label>
  );
}
