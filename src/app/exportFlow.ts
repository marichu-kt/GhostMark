import type { TranslationKey } from "../features/i18n/i18n";

export type ExportWorkflowStep = "import" | "edit" | "export" | "security";

export interface ExportFooterModel {
  visible: boolean;
  disabled: boolean;
  labelKey: TranslationKey;
  showDownloadIcon: boolean;
}

export interface ExportFooterInput {
  hasDocument: boolean;
  activeStep: ExportWorkflowStep;
  watermarkReady: boolean;
  generating: boolean;
  hasExportResult: boolean;
}

export function getExportFooterModel({
  hasDocument,
  activeStep,
  watermarkReady,
  generating,
  hasExportResult,
}: ExportFooterInput): ExportFooterModel | null {
  if (!hasDocument || activeStep === "security" || activeStep === "import") {
    return null;
  }

  if (activeStep === "export" && hasExportResult && !generating) {
    return null;
  }

  return {
    visible: true,
    disabled: !watermarkReady || generating,
    labelKey: generating ? "preview.loading" : "actions.exportPdf",
    showDownloadIcon: activeStep === "export",
  };
}
