import { classNames } from "./classNames";

export interface TabOption<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

export function Tabs<T extends string>({ options, value, onChange, label }: TabsProps<T>) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-steel-100">{label}</span>
      <div className="grid grid-cols-2 gap-1 rounded-md border border-graphite-700 bg-graphite-950 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={classNames(
              "rounded px-3 py-2 text-sm transition-colors",
              option.value === value
                ? "bg-amberline-300 text-graphite-950"
                : "text-steel-200 hover:bg-graphite-800",
            )}
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
