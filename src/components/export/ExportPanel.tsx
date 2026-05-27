import { Download } from "lucide-react";
import type { PdfExportResult } from "../../types/pdf";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";
import { FieldGroup } from "../ui/FieldGroup";
import { Input } from "../ui/Input";
import { Notice } from "../ui/Notice";
import { Toggle } from "../ui/Toggle";
import { ExportSummary } from "./ExportSummary";

interface ExportPanelProps {
  outputFileName: string;
  onOutputFileNameChange: (value: string) => void;
  cleanupMetadata: boolean;
  onCleanupMetadataChange: (value: boolean) => void;
  clearAfterDownload: boolean;
  onClearAfterDownloadChange: (value: boolean) => void;
  removePreviewData: boolean;
  onRemovePreviewDataChange: (value: boolean) => void;
  disabled: boolean;
  generating: boolean;
  error: string | null;
  result: PdfExportResult | null;
  watermarkSummary: string;
  affectedPagesSummary: string;
  validationMessage?: string;
  onGenerate: () => void;
  onStartNew: () => void;
  onClearSession: () => void;
}

export function ExportPanel({
  outputFileName,
  onOutputFileNameChange,
  cleanupMetadata,
  onCleanupMetadataChange,
  clearAfterDownload,
  onClearAfterDownloadChange,
  removePreviewData,
  onRemovePreviewDataChange,
  disabled,
  generating,
  error,
  result,
  watermarkSummary,
  affectedPagesSummary,
  validationMessage,
  onGenerate,
  onStartNew,
  onClearSession,
}: ExportPanelProps) {
  const { t } = useTranslation();

  return (
    <>
      <FieldGroup title={t("export.title")} description={disabled ? t("export.noDocument") : t("export.ready")}>
        <Input
          label={t("export.outputFileName")}
          value={outputFileName}
          onChange={(event) => onOutputFileNameChange(event.target.value)}
        />
        <div className="grid gap-2 rounded-md border border-graphite-700 bg-graphite-950 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-steel-400">{t("export.summaryWatermark")}</span>
            <span className="text-right font-medium text-white">{watermarkSummary}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-steel-400">{t("export.summaryPages")}</span>
            <span className="text-right font-medium text-white">{affectedPagesSummary}</span>
          </div>
        </div>
        <Toggle
          label={t("export.clearAfterDownload")}
          checked={clearAfterDownload}
          onChange={onClearAfterDownloadChange}
        />
        {validationMessage ? <Notice tone="warning">{validationMessage}</Notice> : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button variant="primary" disabled={disabled || generating} onClick={onGenerate}>
          <Download size={16} aria-hidden="true" />
          {generating ? t("preview.loading") : t("actions.generatePdf")}
        </Button>
      </FieldGroup>

      <details className="rounded-md border border-graphite-700 bg-graphite-950/70">
        <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-white">
          {t("export.details")}
        </summary>
        <div className="grid gap-3 border-t border-graphite-700 p-3">
          <Toggle
            label={t("export.metadataCleanup")}
            checked={cleanupMetadata}
            onChange={onCleanupMetadataChange}
          />
          <Toggle
            label={t("export.removePreviewData")}
            checked={removePreviewData}
            onChange={onRemovePreviewDataChange}
          />
        </div>
      </details>

      <ExportSummary result={result} onStartNew={onStartNew} onClearSession={onClearSession} />
    </>
  );
}
