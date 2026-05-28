import type { PdfExportResult } from "../../types/pdf";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";

interface ExportSummaryProps {
  result: PdfExportResult | null;
  onStartNew: () => void;
}

export function ExportSummary({ result, onStartNew }: ExportSummaryProps) {
  const { t } = useTranslation();

  if (!result) {
    return null;
  }

  return (
    <section className="grid gap-3 rounded-md border border-local-500/60 bg-local-700/10 p-3">
      <p className="text-sm font-semibold text-local-100">{t("export.complete")}</p>
      <a
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-steel-500 bg-graphite-800 px-4 py-2 text-sm font-medium text-steel-100 transition-colors hover:bg-graphite-700"
        href={result.url}
        download={result.fileName}
      >
        {t("actions.downloadAgain")}
      </a>
      <Button variant="secondary" onClick={onStartNew}>
        {t("actions.startNewDocument")}
      </Button>
    </section>
  );
}
