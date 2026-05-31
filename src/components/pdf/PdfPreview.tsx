import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { LoadedPdf } from "../../types/pdf";
import type { DocumentLayer } from "../../types/watermark";
import {
  clampPreviewPage,
  getVisiblePageCount,
  shouldUseLargePdfMode,
} from "../../features/pdf/largePdf";
import { getPdfPageSize, renderPdfPageToCanvas } from "../../features/pdf/renderPdfPreview";
import { createBlackoutRectFromDrag } from "../../features/watermark/blackoutDrawing";
import { SAFELAYER_PREVIEW_PAGE_LIMIT } from "../../features/watermark/safelayerPattern";
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
  onLayersChange: (layers: DocumentLayer[]) => void;
}

interface DragPoint {
  x: number;
  y: number;
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
  onLayersChange,
}: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [pageDisplaySize, setPageDisplaySize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blackoutDrag, setBlackoutDrag] = useState<{ start: DragPoint; current: DragPoint } | null>(null);
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

  const selectedBlackoutLayer =
    layers.find((layer) => layer.id === selectedLayerId && layer.type === "blackout" && layer.enabled) ?? null;
  const drawingEnabled = Boolean(selectedBlackoutLayer && previewEnabled && pageDisplaySize.width > 0 && pageDisplaySize.height > 0);
  const safeLayerPreviewLimited =
    previewEnabled &&
    safeCurrentPage > SAFELAYER_PREVIEW_PAGE_LIMIT &&
    layers.some((layer) => layer.enabled && layer.type === "safelayer");

  function getPointerPoint(event: PointerEvent<HTMLDivElement>): DragPoint {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: Math.min(rect.width, Math.max(0, event.clientX - rect.left)),
      y: Math.min(rect.height, Math.max(0, event.clientY - rect.top)),
    };
  }

  function handleBlackoutPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!drawingEnabled) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = getPointerPoint(event);
    setBlackoutDrag({ start, current: start });
  }

  function handleBlackoutPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!blackoutDrag) {
      return;
    }

    setBlackoutDrag({ ...blackoutDrag, current: getPointerPoint(event) });
  }

  function handleBlackoutPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!blackoutDrag || !selectedBlackoutLayer) {
      setBlackoutDrag(null);
      return;
    }

    const end = getPointerPoint(event);
    const width = Math.abs(end.x - blackoutDrag.start.x);
    const height = Math.abs(end.y - blackoutDrag.start.y);
    setBlackoutDrag(null);

    if (width < 4 || height < 4) {
      return;
    }

    const rect = createBlackoutRectFromDrag({
      id: crypto.randomUUID(),
      page: safeCurrentPage,
      start: blackoutDrag.start,
      end,
      zoom,
      pageHeight: pageDisplaySize.height,
    });

    onLayersChange(
      layers.map((layer) =>
        layer.id === selectedBlackoutLayer.id
          ? { ...layer, blackoutRects: [...layer.blackoutRects, rect] }
          : layer,
      ),
    );
  }

  const dragBox = blackoutDrag
    ? {
        left: Math.min(blackoutDrag.start.x, blackoutDrag.current.x),
        top: Math.min(blackoutDrag.start.y, blackoutDrag.current.y),
        width: Math.abs(blackoutDrag.current.x - blackoutDrag.start.x),
        height: Math.abs(blackoutDrag.current.y - blackoutDrag.start.y),
      }
    : null;

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
            {drawingEnabled ? (
              <div
                className="absolute inset-0 cursor-crosshair touch-none"
                role="presentation"
                onPointerDown={handleBlackoutPointerDown}
                onPointerMove={handleBlackoutPointerMove}
                onPointerUp={handleBlackoutPointerUp}
                onPointerCancel={() => setBlackoutDrag(null)}
              >
                {dragBox ? (
                  <div
                    className="absolute border border-white/75 bg-black/80 shadow-[0_0_0_1px_rgba(0,0,0,0.75)]"
                    style={{
                      left: dragBox.left,
                      top: dragBox.top,
                      width: dragBox.width,
                      height: dragBox.height,
                    }}
                  />
                ) : null}
              </div>
            ) : null}
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
          {safeLayerPreviewLimited ? (
            <div className="absolute bottom-6 left-6 right-6">
              <Notice tone="info">
                {t("safelayer.previewLimited", { limit: SAFELAYER_PREVIEW_PAGE_LIMIT })}{" "}
                {t("safelayer.exportIncludesFullPdf")}
              </Notice>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
