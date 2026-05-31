import { type ReactNode } from "react";

interface FieldGroupProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FieldGroup({ title, description, children }: FieldGroupProps) {
  return (
    <section className="grid min-w-0 max-w-full gap-4 border-b border-graphite-700 pb-5 last:border-b-0 last:pb-0">
      <div className="grid min-w-0 gap-1">
        <h3 className="min-w-0 break-words text-sm font-semibold text-white">{title}</h3>
        {description ? <p className="text-xs leading-5 text-steel-300">{description}</p> : null}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
