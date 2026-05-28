import { type ReactNode } from "react";

interface RightPanelProps {
  title: string;
  children: ReactNode;
}

export function RightPanel({ title, children }: RightPanelProps) {
  return (
    <aside className="w-full shrink-0 border-t border-graphite-700 bg-graphite-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] lg:w-[360px] lg:border-l lg:border-t-0 lg:shadow-[inset_1px_0_0_rgba(255,255,255,0.02)]">
      <div className="border-b border-graphite-700 bg-graphite-950/45 px-4 py-3 lg:px-5 lg:py-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-steel-200">{title}</h2>
      </div>
      <div className="control-scrollbar max-h-[70vh] overflow-auto px-4 py-4 lg:h-[calc(100vh-104px)] lg:max-h-none lg:px-5 lg:py-5">
        <div className="grid gap-5">{children}</div>
      </div>
    </aside>
  );
}
