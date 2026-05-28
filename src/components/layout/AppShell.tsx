import { type ReactNode } from "react";
import type { WorkflowStep } from "./Sidebar";
import { Header } from "./Header";
import { RightPanel } from "./RightPanel";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  activeStep: WorkflowStep;
  onStepChange: (step: WorkflowStep) => void;
  fileName?: string;
  canExport: boolean;
  hasDocument: boolean;
  watermarkReady: boolean;
  showSidebar?: boolean;
  showRightPanel?: boolean;
  onExport: () => void;
  rightPanelTitle: string;
  rightPanel: ReactNode;
  children: ReactNode;
}

export function AppShell({
  activeStep,
  onStepChange,
  fileName,
  canExport,
  hasDocument,
  watermarkReady,
  showSidebar = true,
  showRightPanel = true,
  onExport,
  rightPanelTitle,
  rightPanel,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-graphite-950 text-steel-100">
      <Header fileName={fileName} canExport={canExport} hasDocument={hasDocument} onExport={onExport} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:overflow-hidden">
        {showSidebar ? (
          <Sidebar
            activeStep={activeStep}
            hasDocument={hasDocument}
            watermarkReady={watermarkReady}
            onChange={onStepChange}
          />
        ) : null}
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden bg-graphite-900">
          {children}
        </main>
        {showRightPanel ? <RightPanel title={rightPanelTitle}>{rightPanel}</RightPanel> : null}
      </div>
    </div>
  );
}
