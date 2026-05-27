import { type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Collapsible({ title, description, defaultOpen = false, children }: CollapsibleProps) {
  return (
    <details
      className="group rounded-md border border-graphite-700 bg-graphite-950/70"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-3 text-sm text-white marker:hidden">
        <span className="grid gap-1">
          <span className="font-semibold">{title}</span>
          {description ? <span className="text-xs leading-5 text-steel-400">{description}</span> : null}
        </span>
        <ChevronDown
          size={16}
          className="mt-0.5 text-steel-300 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="grid gap-4 border-t border-graphite-700 px-3 py-4">{children}</div>
    </details>
  );
}
