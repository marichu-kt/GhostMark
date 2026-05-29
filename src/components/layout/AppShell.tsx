import { type ReactNode } from "react";
import { Header } from "./Header";
import { RightPanel } from "./RightPanel";

interface AppShellProps {
  fileName?: string;
  hasDocument: boolean;
  showRightPanel?: boolean;
  onSecurity: () => void;
  rightPanelTitle: string;
  rightPanel: ReactNode;
  rightPanelFooter?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  fileName,
  hasDocument,
  showRightPanel = true,
  onSecurity,
  rightPanelTitle,
  rightPanel,
  rightPanelFooter,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-graphite-950 text-steel-100">
      <Header
        fileName={fileName}
        hasDocument={hasDocument}
        onSecurity={onSecurity}
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:overflow-hidden">
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden bg-graphite-900">
          {children}
        </main>
        {showRightPanel ? (
          <RightPanel title={rightPanelTitle} footer={rightPanelFooter}>
            {rightPanel}
          </RightPanel>
        ) : null}
      </div>
    </div>
  );
}
