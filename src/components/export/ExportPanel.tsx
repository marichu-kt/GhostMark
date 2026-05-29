import { Download } from "lucide-react";
import type { PdfExportResult } from "../../types/pdf";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";
import { FieldGroup } from "../ui/FieldGroup";
import { Input } from "../ui/Input";
import { Notice } from "../ui/Notice";
import { ExportSummary } from "./ExportSummary";

interface ExportPanelProps {
  outputFileName: string;
  onOutputFileNameChange: (value: string) => void;
  disabled: boolean;
  generating: boolean;
  error: string | null;
  result: PdfExportResult | null;
  watermarkSummary: string;
  affectedPagesSummary: string;
  validationMessage?: string;
  filenameError?: string;
  onGenerate: () => void;
  onStartNew: () => void;
}

export function ExportPanel({
  outputFileName,
  onOutputFileNameChange,
  disabled,
  generating,
  error,
  result,
  watermarkSummary,
  affectedPagesSummary,
  validationMessage,
  filenameError,
  onGenerate,
  onStartNew,
}: ExportPanelProps) {
  const { t } = useTranslation();

  return (
    <>
      <FieldGroup
        title={t("export.title")}
        description={disabled ? validationMessage ?? t("export.noDocument") : undefined}
      >
        <Input
          label={t("export.outputFileName")}
          value={outputFileName}
          error={filenameError}
          onChange={(event) => onOutputFileNameChange(event.target.value)}
        />
        <div className="grid gap-2 rounded-md border border-graphite-700 bg-graphite-950 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-steel-400">{t("export.summaryLayers")}</span>
            <span className="text-right font-medium text-white">{watermarkSummary}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-steel-400">{t("export.summaryPages")}</span>
            <span className="text-right font-medium text-white">{affectedPagesSummary}</span>
          </div>
        </div>
        {disabled && validationMessage ? <Notice tone="warning">{validationMessage}</Notice> : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button variant="primary" disabled={disabled || generating} onClick={onGenerate}>
          <Download size={16} aria-hidden="true" />
          {generating ? t("preview.loading") : t("actions.exportPdf")}
        </Button>
      </FieldGroup>

      <ExportSummary result={result} onStartNew={onStartNew} />
    </>
  );
}
