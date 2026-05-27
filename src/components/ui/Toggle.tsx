import { classNames } from "./classNames";

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ label, checked, onChange, description, disabled }: ToggleProps) {
  return (
    <label
      className={classNames(
        "flex cursor-pointer items-start justify-between gap-4 rounded-md border border-graphite-700 bg-graphite-900 p-3 text-sm",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="grid gap-1">
        <span className="font-medium text-steel-100">{label}</span>
        {description ? <span className="text-xs leading-5 text-steel-300">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-amberline-300"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
