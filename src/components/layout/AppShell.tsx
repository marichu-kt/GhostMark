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
  onExport,
  rightPanelTitle,
  rightPanel,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-graphite-950 text-steel-100">
      <Header fileName={fileName} canExport={canExport} onExport={onExport} />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          activeStep={activeStep}
          hasDocument={hasDocument}
          watermarkReady={watermarkReady}
          onChange={onStepChange}
        />
        <main className="control-scrollbar min-w-0 flex-1 overflow-auto bg-graphite-900">
          {children}
        </main>
        <RightPanel title={rightPanelTitle}>{rightPanel}</RightPanel>
      </div>
      <StatusBar />
    </div>
  );
}
