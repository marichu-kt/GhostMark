import type { PdfExportResult } from "../../types/pdf";
import { useTranslation } from "../../features/i18n/useTranslation";
import { FieldGroup } from "../ui/FieldGroup";
import { Notice } from "../ui/Notice";
import { ExportSummary } from "./ExportSummary";

interface ExportPanelProps {
  outputFileName: string;
  disabled: boolean;
  error: string | null;
  result: PdfExportResult | null;
  watermarkSummary: string;
  affectedPagesSummary: string;
  validationMessage?: string;
  progress?: { current: number; total: number } | null;
  largePdfMode?: boolean;
  visiblePageCount?: number;
  totalPageCount?: number;
  onStartNew: () => void;
}

export function ExportPanel({
  outputFileName,
  disabled,
  error,
  result,
  watermarkSummary,
  affectedPagesSummary,
  validationMessage,
  progress,
  largePdfMode = false,
  visiblePageCount,
  totalPageCount,
  onStartNew,
}: ExportPanelProps) {
  const { t } = useTranslation();

  return (
    <>
      <FieldGroup
        title={t("export.title")}
        description={disabled ? validationMessage ?? t("export.noDocument") : undefined}
      >
        <div className="grid gap-2 rounded-md border border-graphite-700 bg-graphite-950 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-steel-400">{t("export.outputFileName")}</span>
            <span className="min-w-0 truncate text-right font-medium text-white">{outputFileName}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-steel-400">{t("export.summaryLayers")}</span>
            <span className="text-right font-medium text-white">{watermarkSummary}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-steel-400">{t("export.summaryPages")}</span>
            <span className="text-right font-medium text-white">{affectedPagesSummary}</span>
          </div>
        </div>
        {largePdfMode && visiblePageCount && totalPageCount ? (
          <Notice tone="info">
            {t("largePdf.exportNote", {
              visible: visiblePageCount,
              total: totalPageCount,
            })}
          </Notice>
        ) : null}
        <Notice tone="info">
          {t("export.flattenedCopyProtection")} {t("metadata.cleanupApplied")} {t("metadata.notCertified")}
        </Notice>
        {progress ? (
          <Notice tone="info">
            {t("export.processingPage", {
              current: progress.current,
              total: progress.total,
            })}
          </Notice>
        ) : null}
        {disabled && validationMessage ? <Notice tone="warning">{validationMessage}</Notice> : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
      </FieldGroup>

      <ExportSummary result={result} onStartNew={onStartNew} />
    </>
  );
}
