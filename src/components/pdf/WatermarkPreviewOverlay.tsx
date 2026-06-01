import { useEffect, useMemo, useRef, useState } from "react";
import type { DocumentLayer } from "../../types/watermark";
import { resolvePageRules } from "../../features/pdf/pageRules";
import { FLATTENED_EXPORT_SCALE } from "../../features/pdf/flattenedExportPlan";
import {
  createImageRenderPlan,
  createSealRenderPlan,
  getPatternTextSize,
  getTextLayerSize,
} from "../../features/watermark/layerGeometry";
import { drawSafeLayerContoursToCanvas } from "../../features/watermark/safelayerCanvasRenderer";
import { SAFELAYER_PREVIEW_PAGE_LIMIT } from "../../features/watermark/safelayerRenderer";
import { createSafeLayerSvgMarkup } from "../../features/watermark/safelayerSvgRenderer";
import { resolvePreviewWatermarkPosition } from "../../features/watermark/previewGeometry";

interface WatermarkPreviewOverlayProps {
  layers: DocumentLayer[];
  enabled: boolean;
  zoom: number;
  currentPage: number;
  totalPages: number;
  pageWidth: number;
  pageHeight: number;
  selectedLayerId?: string | null;
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return `data:${mimeType};base64,${btoa(binary)}`;
}

function layerAppliesToPage(layer: DocumentLayer, pageIndex: number, totalPages: number): boolean {
  try {
    const selectedPages = resolvePageRules(layer.pages, totalPages);
    return selectedPages.includes(pageIndex);
  } catch {
    return false;
  }
}

function SafeLayerCanvasPreview({
  layer,
  currentPage,
  pageWidth,
  pageHeight,
  zoom,
  selected,
}: {
  layer: DocumentLayer;
  currentPage: number;
  pageWidth: number;
  pageHeight: number;
  zoom: number;
  selected: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backingScale = FLATTENED_EXPORT_SCALE / Math.max(0.01, zoom);
  const width = Math.max(1, Math.round(pageWidth * backingScale));
  const height = Math.max(1, Math.round(pageHeight * backingScale));
  const { model, svg } = useMemo(
    () =>
      createSafeLayerSvgMarkup({
        layer,
        pageNumber: currentPage,
        width,
        height,
        quality: "preview",
      }),
    [currentPage, height, layer, width],
  );

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(0, 0, width, height);
    drawSafeLayerContoursToCanvas({
      context,
      model,
      layer,
      quality: "preview",
    });
  }, [height, layer, model, width]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          width: pageWidth,
          height: pageHeight,
          outline: selected ? "1px solid rgba(198,40,40,0.45)" : undefined,
        }}
      />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{ width: pageWidth, height: pageHeight }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </>
  );
}

export function WatermarkPreviewOverlay({
  layers,
  enabled,
  zoom,
  currentPage,
  totalPages,
  pageWidth,
  pageHeight,
  selectedLayerId,
}: WatermarkPreviewOverlayProps) {
  const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(
    () => new Map(),
  );
  const imageUrls = useMemo(() => {
    const urls = new Map<string, string>();

    for (const layer of layers) {
      if (layer.type === "image" && layer.imageData && layer.imageMimeType) {
        urls.set(layer.id, bytesToDataUrl(layer.imageData, layer.imageMimeType));
      }
    }

    return urls;
  }, [layers]);

  useEffect(() => {
    let cancelled = false;

    for (const [layerId, imageUrl] of imageUrls) {
      const image = new Image();
      image.onload = () => {
        if (cancelled) {
          return;
        }

        setImageDimensions((current) => {
          if (current.has(layerId)) {
            return current;
          }

          const next = new Map(current);
          next.set(layerId, {
            width: Math.max(1, image.naturalWidth || image.width || 260),
            height: Math.max(1, image.naturalHeight || image.height || 260),
          });
          return next;
        });
      };
      image.src = imageUrl;
    }

    setImageDimensions((current) => {
      const next = new Map<string, { width: number; height: number }>();

      for (const layerId of imageUrls.keys()) {
        const dimensions = current.get(layerId);

        if (dimensions) {
          next.set(layerId, dimensions);
        }
      }

      return next.size === current.size ? current : next;
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrls]);

  if (!enabled || pageWidth <= 0 || pageHeight <= 0) {
    return null;
  }

  const pageIndex = currentPage - 1;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {layers.map((layer) => {
        if (!layer.enabled || !layerAppliesToPage(layer, pageIndex, totalPages)) {
          return null;
        }

        const opacity = Math.min(1, Math.max(0, layer.opacity));
        const fontSize = Math.max(10, layer.fontSize * zoom);
        const textColor = layer.color || "#2f343a";
        const baseText = layer.text.trim();
        const selected = layer.id === selectedLayerId;

        if (layer.type === "text" && baseText) {
          const size = getTextLayerSize({ ...layer, fontSize });
          const position = resolvePreviewWatermarkPosition({
            layer,
            pageWidth,
            pageHeight,
            elementWidth: size.width,
            elementHeight: size.height,
            zoom,
            rotation: layer.rotation,
          });

          return (
            <div
              key={layer.id}
              className="absolute whitespace-nowrap font-bold uppercase tracking-normal"
              style={{
                ...position,
                width: size.width,
                lineHeight: `${size.height}px`,
                color: textColor,
                fontSize,
                opacity,
                transformOrigin: "center",
                outline: selected ? "1px solid rgba(198,40,40,0.45)" : undefined,
              }}
            >
              {baseText}
            </div>
          );
        }

        if (layer.type === "pattern" && baseText) {
          const spacingX = Math.max(70, layer.patternSpacingX * zoom);
          const spacingY = Math.max(60, layer.patternSpacingY * zoom);
          const size = getPatternTextSize({ ...layer, fontSize });
          const columns = Math.ceil(pageWidth / spacingX) + 4;
          const rows = Math.ceil(pageHeight / spacingY) + 4;
          const marks = Array.from({ length: rows * columns }, (_, index) => {
            const row = Math.floor(index / columns);
            const column = index % columns;
            const stagger = layer.patternStaggered && row % 2 === 1 ? spacingX / 2 : 0;

            return {
              key: `${row}-${column}`,
              x: column * spacingX - spacingX + stagger,
              y: row * spacingY - spacingY,
            };
          });

          return marks.map((mark) => (
            <div
              key={`${layer.id}-${mark.key}`}
              className="absolute whitespace-nowrap font-bold uppercase"
              style={{
                left: mark.x,
                top: mark.y,
                width: size.width,
                lineHeight: `${size.height}px`,
                color: textColor,
                fontSize,
                opacity,
                transform: `rotate(${layer.rotation}deg)`,
                transformOrigin: "center",
              }}
            >
              {baseText}
            </div>
          ));
        }

        if (layer.type === "safelayer") {
          if (currentPage > SAFELAYER_PREVIEW_PAGE_LIMIT) {
            return null;
          }

          return (
            <SafeLayerCanvasPreview
              key={layer.id}
              layer={layer}
              currentPage={currentPage}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              zoom={zoom}
              selected={selected}
            />
          );
        }

        if (layer.type === "blackout") {
          return layer.blackoutRects
            .filter((rect) => rect.page === currentPage)
            .map((rect) => (
              <div
                key={`${layer.id}-${rect.id}`}
                className="absolute bg-black"
                style={{
                  left: rect.x * zoom,
                  top: pageHeight - (rect.y + rect.height) * zoom,
                  width: Math.max(1, rect.width * zoom),
                  height: Math.max(1, rect.height * zoom),
                  outline: selected ? "1px solid rgba(255,255,255,0.65)" : undefined,
                }}
              />
            ));
        }

        if (layer.type === "seal") {
          const plan = createSealRenderPlan({
            layer,
            pageWidth,
            pageHeight,
            displayScale: zoom,
          });

          return (
            <div
              key={layer.id}
              className="absolute text-center uppercase"
              style={{
                left: plan.x,
                top: plan.top,
                width: plan.width,
                height: plan.height,
                borderColor: plan.color,
                borderWidth: plan.borderWidth,
                borderStyle: "solid",
                borderRadius: plan.circular ? "9999px" : plan.borderRadius,
                color: plan.color,
                opacity: plan.opacity,
                transform: `rotate(${plan.rotation}deg)`,
                transformOrigin: "center",
              }}
            >
              {!plan.circular ? (
                <div
                  className="absolute border-t"
                  style={{
                    left: plan.dividerInset,
                    right: plan.dividerInset,
                    top: plan.dividerTop,
                    borderColor: plan.color,
                    borderTopWidth: Math.max(1, plan.borderWidth * 0.55),
                    opacity: 0.7,
                  }}
                />
              ) : null}
              <div
                className="absolute left-0 right-0 -translate-y-1/2 font-bold tracking-[0.08em]"
                style={{
                  top: plan.titleY,
                  fontSize: plan.titleFontSize,
                }}
              >
                {plan.title}
              </div>
              <div
                className="absolute left-0 right-0 -translate-y-1/2 tracking-[0.18em]"
                style={{ top: plan.subtitleY, fontSize: plan.subtitleFontSize }}
              >
                {plan.subtitle}
              </div>
              {plan.documentId ? (
                <div
                  className="absolute left-0 right-0 -translate-y-1/2"
                  style={{ top: plan.documentIdY, fontSize: plan.metaFontSize }}
                >
                  {plan.documentId}
                </div>
              ) : null}
              {plan.dateText ? (
                <div
                  className="absolute left-0 right-0 -translate-y-1/2"
                  style={{ top: plan.dateY, fontSize: plan.metaFontSize }}
                >
                  {plan.dateText}
                </div>
              ) : null}
              {!plan.circular ? (
                <div
                  className="absolute border-t"
                  style={{
                    left: plan.dividerInset,
                    right: plan.dividerInset,
                    top: plan.dividerBottom,
                    borderColor: plan.color,
                    borderTopWidth: Math.max(1, plan.borderWidth * 0.55),
                    opacity: 0.7,
                  }}
                />
              ) : null}
            </div>
          );
        }

        if (layer.type === "image") {
          const imageUrl = imageUrls.get(layer.id);

          if (!imageUrl) {
            return null;
          }

          const dimensions = imageDimensions.get(layer.id);
          const plan = createImageRenderPlan({
            layer,
            pageWidth,
            pageHeight,
            sourceWidth: dimensions?.width,
            sourceHeight: dimensions?.height,
            displayScale: zoom,
          });

          return (
            <img
              key={layer.id}
              src={imageUrl}
              alt=""
              className="absolute object-contain"
              style={{
                left: plan.x,
                top: plan.top,
                width: plan.width,
                height: plan.height,
                opacity,
                objectFit: "contain",
                transform: `rotate(${plan.rotation}deg)`,
                transformOrigin: "center",
              }}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
