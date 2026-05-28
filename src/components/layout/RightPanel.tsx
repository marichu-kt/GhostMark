import { type ReactNode } from "react";

interface RightPanelProps {
  title: string;
  children: ReactNode;
}

export function RightPanel({ title, children }: RightPanelProps) {
  return (
    <aside className="flex max-h-[50vh] w-full shrink-0 flex-col border-t border-graphite-700 bg-[#10151c] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] lg:max-h-none lg:w-[380px] lg:border-l lg:border-t-0 lg:shadow-[inset_1px_0_0_rgba(255,255,255,0.02)]">
      <div className="shrink-0 border-b border-graphite-700 bg-graphite-950/55 px-4 py-4 lg:px-5">
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="control-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-8 lg:px-5 lg:py-5 lg:pb-10">
        <div className="grid gap-5 pb-4">{children}</div>
      </div>
    </aside>
  );
}
