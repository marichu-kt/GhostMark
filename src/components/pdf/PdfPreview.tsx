import { useEffect, useRef, useState } from "react";
import type { LoadedPdf } from "../../types/pdf";
import type { WatermarkConfig } from "../../types/watermark";
import { getPdfPageSize, renderPdfPageToCanvas } from "../../features/pdf/renderPdfPreview";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Badge } from "../ui/Badge";
import { Notice } from "../ui/Notice";
import { PageNavigator } from "./PageNavigator";
import { ThumbnailRail } from "./ThumbnailRail";
import { WatermarkPreviewOverlay } from "./WatermarkPreviewOverlay";
import { ZoomControls } from "./ZoomControls";

interface PdfPreviewProps {
  document: LoadedPdf;
  watermarkConfig: WatermarkConfig;
  currentPage: number;
  zoom: number;
  previewEnabled: boolean;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onPreviewEnabledChange: (enabled: boolean) => void;
}

export function PdfPreview({
  document,
  watermarkConfig,
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
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={previewEnabled ? "safe" : "neutral"}>{t("preview.livePreview")}</Badge>
            <label className="flex items-center gap-2 text-xs text-steel-200">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-red"
                checked={previewEnabled}
                onChange={(event) => onPreviewEnabledChange(event.target.checked)}
              />
              {t("preview.toggleWatermark")}
            </label>
          </div>
          <ZoomControls zoom={zoom} onZoomChange={onZoomChange} onFitWidth={() => void fitWidth()} />
        </div>
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-b border-graphite-700 bg-graphite-900 px-4">
          <PageNavigator
            currentPage={currentPage}
            totalPages={document.pageCount}
            onChange={onPageChange}
          />
          <p className="text-xs text-steel-400">{t("preview.visualNote")}</p>
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
            <WatermarkPreviewOverlay
              config={watermarkConfig}
              enabled={previewEnabled}
              zoom={zoom}
              pageWidth={pageDisplaySize.width}
              pageHeight={pageDisplaySize.height}
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
