import { type InputHTMLAttributes } from "react";
import { classNames } from "./classNames";

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  displayValue?: string;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  displayValue,
  onChange,
  id,
  className,
  ...props
}: SliderProps) {
  const sliderId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="grid min-w-0 gap-2 text-sm text-steel-100" htmlFor={sliderId}>
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 break-words font-medium">{label}</span>
        <span className="shrink-0 tabular-nums text-steel-300">{displayValue ?? value}</span>
      </span>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={classNames("min-w-0 max-w-full accent-brand-red", className)}
        {...props}
      />
    </label>
  );
}
