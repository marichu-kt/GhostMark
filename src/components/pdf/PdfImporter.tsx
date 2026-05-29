import { type DragEvent, useRef, useState } from "react";
import { FileText, FileUp, LockKeyhole, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
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
  mode?: "button" | "panel" | "dropzone";
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
  const [dragActive, setDragActive] = useState(false);
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
      setError(
        caughtError instanceof PdfImportError && caughtError.message.includes(".pdf")
          ? t("import.errorChoosePdf")
          : t("import.errorLoad"),
      );
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    void handleFile(event.dataTransfer.files?.[0]);
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

  if (mode === "dropzone") {
    return (
      <section className="mx-auto grid w-full max-w-4xl gap-3">
        {input}
        <div
          className={`ghostmark-neon-frame rounded-2xl border bg-[#101728]/78 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.45),0_0_48px_rgba(255,45,61,0.16)] backdrop-blur transition sm:p-6 ${
            dragActive
              ? "border-[#ff4b5c] ring-4 ring-brand-red/25"
              : "border-brand-red/55 ring-1 ring-white/10"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="grid place-items-center gap-[clamp(0.9rem,2.2vh,1.35rem)] rounded-xl border border-dashed border-steel-500/60 bg-[radial-gradient(circle_at_center,rgba(255,45,61,0.13),transparent_56%)] px-5 py-[clamp(1.9rem,4.8vh,3.8rem)] text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-brand-red/50 bg-brand-red/10 text-brand-red shadow-[0_0_36px_rgba(255,45,61,0.28)] sm:h-20 sm:w-20">
              <FileText size={38} aria-hidden="true" />
            </div>
            <div className="grid gap-2">
              <h2 className="text-xl font-semibold text-white">{t("import.dropTitle")}</h2>
              <p className="text-sm text-steel-300">{t("import.dropSubtitle")}</p>
            </div>
            <Button variant="primary" size="md" onClick={() => inputRef.current?.click()} disabled={loading}>
              <FileUp size={18} aria-hidden="true" />
              {loading ? t("preview.loading") : t("actions.selectPdf")}
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3 sm:divide-x sm:divide-graphite-700">
            <div className="flex items-start gap-3 px-2 py-1">
              <ShieldCheck size={20} className="mt-0.5 text-brand-red" aria-hidden="true" />
              <div className="grid gap-0.5">
                <div className="text-sm font-semibold text-white">{t("trust.local")}</div>
                <div className="text-xs text-steel-400">{t("trust.localDetail")}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 px-2 py-1 sm:pl-6">
              <LockKeyhole size={20} className="mt-0.5 text-[#8b7cf6]" aria-hidden="true" />
              <div className="grid gap-0.5">
                <div className="text-sm font-semibold text-white">{t("trust.private")}</div>
                <div className="text-xs text-steel-400">{t("trust.privateDetail")}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 px-2 py-1 sm:pl-6">
              <Sparkles size={20} className="mt-0.5 text-[#34d399]" aria-hidden="true" />
              <div className="grid gap-0.5">
                <div className="text-sm font-semibold text-white">{t("trust.fast")}</div>
                <div className="text-xs text-steel-400">{t("trust.fastDetail")}</div>
              </div>
            </div>
          </div>
        </div>
        {error ? <Notice tone="danger">{error}</Notice> : null}
      </section>
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
