import { type ReactNode } from "react";
import { Header } from "./Header";
import { RightPanel } from "./RightPanel";

interface AppShellProps {
  fileName?: string;
  canExport: boolean;
  hasDocument: boolean;
  showRightPanel?: boolean;
  onExport: () => void;
  onImport: () => void;
  onSecurity: () => void;
  rightPanelTitle: string;
  rightPanel: ReactNode;
  children: ReactNode;
}

export function AppShell({
  fileName,
  canExport,
  hasDocument,
  showRightPanel = true,
  onExport,
  onImport,
  onSecurity,
  rightPanelTitle,
  rightPanel,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-graphite-950 text-steel-100">
      <Header
        fileName={fileName}
        canExport={canExport}
        hasDocument={hasDocument}
        onExport={onExport}
        onImport={onImport}
        onSecurity={onSecurity}
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:overflow-hidden">
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden bg-graphite-900">
          {children}
        </main>
        {showRightPanel ? <RightPanel title={rightPanelTitle}>{rightPanel}</RightPanel> : null}
      </div>
    </div>
  );
}
