import { type SelectHTMLAttributes } from "react";
import { classNames } from "./classNames";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  helpText?: string;
}

export function Select({ label, options, helpText, id, className, ...props }: SelectProps) {
  const selectId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="grid min-w-0 gap-1.5 text-sm text-steel-100" htmlFor={selectId}>
      <span className="min-w-0 break-words font-medium">{label}</span>
      <select
        id={selectId}
        className={classNames(
          "min-h-10 min-w-0 max-w-full rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-white",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {helpText ? <span className="text-xs leading-5 text-steel-300">{helpText}</span> : null}
    </label>
  );
}
