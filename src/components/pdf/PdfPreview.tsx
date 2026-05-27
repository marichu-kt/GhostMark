import { useEffect, useRef, useState } from "react";
import type { LoadedPdf } from "../../types/pdf";
import { getPdfPageSize, renderPdfPageToCanvas } from "../../features/pdf/renderPdfPreview";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Notice } from "../ui/Notice";
import { PageNavigator } from "./PageNavigator";
import { ThumbnailRail } from "./ThumbnailRail";
import { ZoomControls } from "./ZoomControls";

interface PdfPreviewProps {
  document: LoadedPdf;
  currentPage: number;
  zoom: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
}

export function PdfPreview({
  document,
  currentPage,
  zoom,
  onPageChange,
  onZoomChange,
}: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!canvasRef.current) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await renderPdfPageToCanvas(document.bytes, canvasRef.current, currentPage, zoom);
      } catch {
        if (!cancelled) {
          setError(t("preview.error"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [currentPage, document.bytes, t, zoom]);

  async function fitWidth() {
    if (!viewportRef.current) {
      return;
    }

    try {
      const pageSize = await getPdfPageSize(document.bytes, currentPage);
      const availableWidth = Math.max(320, viewportRef.current.clientWidth - 64);
      onZoomChange(Number(Math.min(2.5, Math.max(0.35, availableWidth / pageSize.width)).toFixed(2)));
    } catch {
      onZoomChange(1);
    }
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-104px)]">
      <ThumbnailRail
        pageCount={document.pageCount}
        currentPage={currentPage}
        onSelectPage={onPageChange}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-graphite-700 bg-graphite-950/45 px-4">
          <PageNavigator
            currentPage={currentPage}
            totalPages={document.pageCount}
            onChange={onPageChange}
          />
          <ZoomControls zoom={zoom} onZoomChange={onZoomChange} onFitWidth={() => void fitWidth()} />
        </div>

        <div
          ref={viewportRef}
          className="control-scrollbar relative flex flex-1 justify-center overflow-auto bg-[linear-gradient(180deg,#242a31,#1d2228)] p-8"
        >
          <div className="relative h-max w-max">
            <canvas
              ref={canvasRef}
              className="rounded-sm bg-document-50 shadow-[0_18px_42px_rgba(0,0,0,0.48)] ring-1 ring-black/20"
              aria-label={`${t("preview.page")} ${currentPage}`}
            />
            {loading ? (
              <div className="absolute inset-0 grid place-items-center bg-graphite-950/45 text-sm text-steel-100">
                {t("preview.loading")}
              </div>
            ) : null}
          </div>
          {error ? (
            <div className="absolute left-6 right-6 top-6">
              <Notice tone="danger">{error}</Notice>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
