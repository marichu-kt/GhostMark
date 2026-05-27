import { useRef, useState } from "react";
import { FileUp, Trash2 } from "lucide-react";
import type { LoadedPdf } from "../../types/pdf";
import { formatFileSize } from "../../features/pdf/fileFormatting";
import { loadPdf, PdfImportError } from "../../features/pdf/loadPdf";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";

interface PdfImporterProps {
  onLoaded: (document: LoadedPdf) => void;
  loadedPdf?: LoadedPdf | null;
  onRemove?: () => void;
  onClear?: () => void;
  mode?: "button" | "panel";
}

export function PdfImporter({
  onLoaded,
  loadedPdf,
  onRemove,
  onClear,
  mode = "panel",
}: PdfImporterProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const document = await loadPdf(file);
      onLoaded(document);
    } catch (caughtError) {
      setError(caughtError instanceof PdfImportError ? caughtError.message : t("import.errorLoad"));
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept=".pdf,application/pdf"
      className="sr-only"
      onChange={(event) => void handleFile(event.target.files?.[0])}
    />
  );

  if (mode === "button") {
    return (
      <>
        {input}
        <Button variant="primary" onClick={() => inputRef.current?.click()} disabled={loading}>
          <FileUp size={16} aria-hidden="true" />
          {loading ? t("preview.loading") : t("actions.importPdf")}
        </Button>
        {error ? <Notice tone="danger">{error}</Notice> : null}
      </>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h3 className="text-sm font-semibold text-white">{t("import.title")}</h3>
        <p className="text-xs leading-5 text-steel-300">{t("import.instructions")}</p>
      </div>

      {input}
      <Button variant="primary" onClick={() => inputRef.current?.click()} disabled={loading}>
        <FileUp size={16} aria-hidden="true" />
        {loading ? t("preview.loading") : t("actions.importPdf")}
      </Button>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {loadedPdf ? (
        <div className="grid gap-3 rounded-md border border-graphite-700 bg-graphite-950 p-3 text-sm">
          <Badge tone="safe" className="w-max">
            {t("badges.loadedLocally")}
          </Badge>
          <dl className="grid gap-2 text-xs">
            <div className="grid gap-1">
              <dt className="text-steel-500">{t("import.fileName")}</dt>
              <dd className="break-words text-steel-100">{loadedPdf.fileName}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-steel-500">{t("import.fileSize")}</dt>
              <dd className="text-steel-100">{formatFileSize(loadedPdf.fileSize)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-steel-500">{t("import.pageCount")}</dt>
              <dd className="text-steel-100">{loadedPdf.pageCount}</dd>
            </div>
          </dl>
          <div className="grid grid-cols-1 gap-2">
            <Button variant="secondary" size="sm" onClick={onRemove}>
              <Trash2 size={15} aria-hidden="true" />
              {t("actions.removeDocument")}
            </Button>
            <Button variant="danger" size="sm" onClick={onClear}>
              {t("actions.clearSession")}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
