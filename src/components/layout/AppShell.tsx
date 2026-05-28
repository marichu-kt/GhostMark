import { type ReactNode } from "react";
import type { WorkflowStep } from "./Sidebar";
import { Header } from "./Header";
import { RightPanel } from "./RightPanel";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";

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
    <div className="flex min-h-screen flex-col bg-graphite-950 text-steel-100">
      <Header fileName={fileName} canExport={canExport} hasDocument={hasDocument} onExport={onExport} />
      <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row lg:overflow-hidden">
        {showSidebar ? (
          <Sidebar
            activeStep={activeStep}
            hasDocument={hasDocument}
            watermarkReady={watermarkReady}
            onChange={onStepChange}
          />
        ) : null}
        <main className="control-scrollbar min-h-[520px] min-w-0 flex-1 overflow-auto bg-graphite-900 lg:min-h-0">
          {children}
        </main>
        {showRightPanel ? <RightPanel title={rightPanelTitle}>{rightPanel}</RightPanel> : null}
      </div>
      <StatusBar />
    </div>
  );
}
