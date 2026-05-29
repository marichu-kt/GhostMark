import { type ReactNode } from "react";

interface RightPanelProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function RightPanel({ title, children, footer }: RightPanelProps) {
  return (
    <aside className="flex min-h-0 max-h-[50vh] w-full shrink-0 flex-col overflow-hidden border-t border-graphite-700 bg-[#10151c] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] lg:h-full lg:max-h-none lg:w-[380px] lg:border-l lg:border-t-0 lg:shadow-[inset_1px_0_0_rgba(255,255,255,0.02)]">
      <div className="shrink-0 border-b border-graphite-700 bg-graphite-950/55 px-4 py-4 lg:px-5">
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="control-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-5 lg:py-5">
        <div className="grid gap-5 pb-5">{children}</div>
      </div>
      {footer ? (
        <div className="shrink-0 border-t border-graphite-700 bg-[#10151c]/98 px-4 py-4 shadow-[0_-12px_32px_rgba(0,0,0,0.22)] lg:px-5">
          {footer}
        </div>
      ) : null}
    </aside>
  );
}
