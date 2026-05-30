import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { LoadedPdf } from "../../types/pdf";
import {
  getVisiblePageCount,
  shouldUseLargePdfMode,
} from "../../features/pdf/largePdf";
import { renderPdfPageToCanvas } from "../../features/pdf/renderPdfPreview";
import { useTranslation } from "../../features/i18n/useTranslation";

interface ThumbnailRailProps {
  document: LoadedPdf;
  currentPage: number;
  onSelectPage: (page: number) => void;
}

interface PageThumbnailProps {
  document: LoadedPdf;
  page: number;
  selected: boolean;
  onSelect: (page: number) => void;
}

function PageThumbnail({ document, page, selected, onSelect }: PageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function renderThumbnail() {
      if (!canvasRef.current) {
        return;
      }

      setFailed(false);

      try {
        await renderPdfPageToCanvas(document.bytes, canvasRef.current, page, 0.18, {
          signal: controller.signal,
          maxCanvasPixels: 900_000,
        });
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    void renderThumbnail();

    return () => {
      cancelled = true;
      controller.abort();

      if (canvasRef.current) {
        canvasRef.current.width = 0;
        canvasRef.current.height = 0;
      }
    };
  }, [document.bytes, page]);

  return (
    <button
      type="button"
      className={`group grid grid-cols-[2rem_1fr] items-start gap-3 rounded-lg border p-2 text-left transition ${
        selected
          ? "border-brand-red bg-brand-red/10 shadow-[0_0_0_1px_rgba(198,40,40,0.35)]"
          : "border-graphite-700 bg-graphite-950/70 hover:border-steel-500"
      }`}
      onClick={() => onSelect(page)}
    >
      <span
        className={`grid h-8 w-8 place-items-center rounded-md text-sm font-semibold ${
          selected ? "bg-brand-red text-white" : "bg-graphite-800 text-steel-200"
        }`}
      >
        {page}
      </span>
      <span className="grid min-h-32 place-items-center rounded-md bg-document-50 p-1 shadow-inner">
        {failed ? (
          <span className="text-xs font-semibold text-graphite-700">{page}</span>
        ) : (
          <canvas ref={canvasRef} className="max-h-32 max-w-full rounded-sm object-contain" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}

export function ThumbnailRail({ document, currentPage, onSelectPage }: ThumbnailRailProps) {
  const { t } = useTranslation();
  const largePdfMode = shouldUseLargePdfMode(document.pageCount);
  const visiblePageCount = getVisiblePageCount(document.pageCount);
  const visiblePages = Array.from({ length: visiblePageCount }, (_, index) => index + 1);

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-graphite-700 bg-[#111820] lg:flex">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-graphite-700 px-4">
        <h2 className="text-base font-semibold text-white">{t("pages.title")}</h2>
        <SlidersHorizontal size={18} className="text-steel-400" aria-hidden="true" />
      </div>
      <div className="control-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {largePdfMode ? (
          <div className="mb-3 rounded-md border border-graphite-700 bg-graphite-950/70 p-2 text-xs leading-5 text-steel-200">
            <strong className="block font-semibold text-white">{t("largePdf.mode")}</strong>
            {t("largePdf.thumbnailNote", {
              visible: visiblePageCount,
              total: document.pageCount,
            })}
          </div>
        ) : null}
        <div className="grid gap-3">
          {visiblePages.map((page) => (
            <PageThumbnail
              key={`${document.id}-${page}`}
              document={document}
              page={page}
              selected={page === currentPage}
              onSelect={onSelectPage}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
