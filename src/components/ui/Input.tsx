import { type InputHTMLAttributes } from "react";
import { classNames } from "./classNames";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helpText?: string;
  error?: string;
}

export function Input({ label, helpText, error, id, className, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="grid min-w-0 gap-1.5 text-sm text-steel-100" htmlFor={inputId}>
      <span className="min-w-0 break-words font-medium">{label}</span>
      <input
        id={inputId}
        className={classNames(
          "min-h-10 min-w-0 max-w-full rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-white placeholder:text-steel-500",
          className,
        )}
        {...props}
      />
      {helpText ? <span className="text-xs leading-5 text-steel-300">{helpText}</span> : null}
      {error ? <span className="text-xs leading-5 text-danger-100">{error}</span> : null}
    </label>
  );
}
