import { type ReactNode } from "react";

interface RightPanelProps {
  title: string;
  children: ReactNode;
}

export function RightPanel({ title, children }: RightPanelProps) {
  return (
    <aside className="w-[360px] shrink-0 border-l border-graphite-700 bg-graphite-900">
      <div className="border-b border-graphite-700 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="control-scrollbar h-[calc(100vh-104px)] overflow-auto px-5 py-5">
        <div className="grid gap-5">{children}</div>
      </div>
    </aside>
  );
}
