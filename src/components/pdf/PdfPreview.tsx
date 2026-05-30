import { useEffect, useRef, useState } from "react";
import type { LoadedPdf } from "../../types/pdf";
import type { DocumentLayer } from "../../types/watermark";
import {
  clampPreviewPage,
  getVisiblePageCount,
  shouldUseLargePdfMode,
} from "../../features/pdf/largePdf";
import { getPdfPageSize, renderPdfPageToCanvas } from "../../features/pdf/renderPdfPreview";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Notice } from "../ui/Notice";
import { PageNavigator } from "./PageNavigator";
import { ThumbnailRail } from "./ThumbnailRail";
import { WatermarkPreviewOverlay } from "./WatermarkPreviewOverlay";
import { ZoomControls } from "./ZoomControls";

interface PdfPreviewProps {
  document: LoadedPdf;
  layers: DocumentLayer[];
  selectedLayerId?: string | null;
  currentPage: number;
  zoom: number;
  previewEnabled: boolean;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onPreviewEnabledChange: (enabled: boolean) => void;
}

export function PdfPreview({
  document,
  layers,
  selectedLayerId,
  currentPage,
  zoom,
  previewEnabled,
  onPageChange,
  onZoomChange,
  onPreviewEnabledChange,
}: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [pageDisplaySize, setPageDisplaySize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const largePdfMode = shouldUseLargePdfMode(document.pageCount);
  const visiblePageCount = getVisiblePageCount(document.pageCount);
  const safeCurrentPage = clampPreviewPage(currentPage, document.pageCount);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      onPageChange(safeCurrentPage);
    }
  }, [currentPage, onPageChange, safeCurrentPage]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function render() {
      if (!canvasRef.current) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await renderPdfPageToCanvas(document.bytes, canvasRef.current, safeCurrentPage, zoom, {
          signal: controller.signal,
        });
        const rect = canvasRef.current.getBoundingClientRect();
        setPageDisplaySize({ width: rect.width, height: rect.height });
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
      controller.abort();
    };
  }, [document.bytes, safeCurrentPage, t, zoom]);

  async function fitWidth() {
    if (!viewportRef.current) {
      return;
    }

    try {
      const pageSize = await getPdfPageSize(document.bytes, safeCurrentPage);
      const availableWidth = Math.max(320, viewportRef.current.clientWidth - 64);
      onZoomChange(Number(Math.min(2.5, Math.max(0.35, availableWidth / pageSize.width)).toFixed(2)));
    } catch {
      onZoomChange(1);
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <ThumbnailRail document={document} currentPage={currentPage} onSelectPage={onPageChange} />
      <section className="flex min-w-0 flex-1 flex-col bg-[#151b22]">
        <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-graphite-700 bg-[#111820]/95 px-4">
          <PageNavigator
            currentPage={safeCurrentPage}
            visiblePages={visiblePageCount}
            totalPages={document.pageCount}
            largePdfMode={largePdfMode}
            onChange={onPageChange}
          />
          <div className="flex flex-wrap items-center gap-3">
            {largePdfMode ? (
              <span className="hidden rounded-md border border-graphite-700 bg-graphite-900 px-3 py-2 text-xs font-medium text-steel-200 xl:inline-flex">
                {t("largePdf.optimized")}
              </span>
            ) : null}
            <ZoomControls zoom={zoom} onZoomChange={onZoomChange} onFitWidth={() => void fitWidth()} />
            <label className="flex min-h-9 items-center gap-2 rounded-md border border-graphite-700 bg-graphite-900 px-3 text-xs font-medium text-steel-100">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-red"
                checked={previewEnabled}
                onChange={(event) => onPreviewEnabledChange(event.target.checked)}
              />
              {t("preview.toggleWatermark")}
            </label>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="control-scrollbar relative flex min-h-0 flex-1 justify-center overflow-auto bg-[radial-gradient(circle_at_center,rgba(64,77,96,0.24),transparent_42%),linear-gradient(180deg,#1c232c,#111820)] p-6 sm:p-8"
        >
          <div className="relative h-max w-max">
            <canvas
              ref={canvasRef}
              className="rounded-sm bg-document-50 shadow-[0_18px_42px_rgba(0,0,0,0.48)] ring-1 ring-black/20"
              aria-label={`${t("preview.page")} ${safeCurrentPage}`}
            />
            <WatermarkPreviewOverlay
              layers={layers}
              enabled={previewEnabled}
              zoom={zoom}
              currentPage={safeCurrentPage}
              totalPages={document.pageCount}
              pageWidth={pageDisplaySize.width}
              pageHeight={pageDisplaySize.height}
              selectedLayerId={selectedLayerId}
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
