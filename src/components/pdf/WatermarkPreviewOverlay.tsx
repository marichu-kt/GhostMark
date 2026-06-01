import { useEffect, useMemo, useRef } from "react";
import type { DocumentLayer } from "../../types/watermark";
import { resolvePageRules } from "../../features/pdf/pageRules";
import { FLATTENED_EXPORT_SCALE } from "../../features/pdf/flattenedExportPlan";
import {
  getImageLayerSize,
  getPatternTextSize,
  getSealLayerSize,
  getTextLayerSize,
} from "../../features/watermark/layerGeometry";
import { drawSafeLayerToCanvas } from "../../features/watermark/safelayerCanvasRenderer";
import { SAFELAYER_PREVIEW_PAGE_LIMIT } from "../../features/watermark/safelayerRenderer";
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

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const backingScale = FLATTENED_EXPORT_SCALE / Math.max(0.01, zoom);
    const width = Math.max(1, Math.round(pageWidth * backingScale));
    const height = Math.max(1, Math.round(pageHeight * backingScale));
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(0, 0, width, height);
    drawSafeLayerToCanvas({
      context,
      canvas,
      layer,
      pageNumber: currentPage,
      quality: "preview",
    });
  }, [currentPage, layer, pageHeight, pageWidth, zoom]);

  return (
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
  const imageUrls = useMemo(() => {
    const urls = new Map<string, string>();

    for (const layer of layers) {
      if (layer.type === "image" && layer.imageData && layer.imageMimeType) {
        urls.set(layer.id, bytesToDataUrl(layer.imageData, layer.imageMimeType));
      }
    }

    return urls;
  }, [layers]);

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
          const sealScale = Math.min(1.8, Math.max(0.55, layer.scale || 1));
          const sealSize = getSealLayerSize(layer);
          const width = sealSize.width * zoom;
          const height = sealSize.height * zoom;
          const position = resolvePreviewWatermarkPosition({
            layer,
            pageWidth,
            pageHeight,
            elementWidth: width,
            elementHeight: height,
            zoom,
            rotation: layer.rotation,
          });
          const documentId = layer.sealDocumentId.trim().toUpperCase();
          const borderWidth = Math.max(1, layer.sealBorderThickness * zoom);

          return (
            <div
              key={layer.id}
              className="absolute grid content-center gap-1 text-center uppercase"
              style={{
                ...position,
                width,
                height,
                borderColor: textColor,
                borderWidth,
                borderStyle: "solid",
                borderRadius: layer.sealStyle === "circular" ? "9999px" : 8 * zoom,
                color: textColor,
                opacity,
                transformOrigin: "center",
              }}
            >
              <div
                className="mx-auto w-[82%] border-b"
                style={{ borderColor: textColor, opacity: 0.65 }}
              />
              <div
                className="relative font-bold tracking-[0.08em]"
                style={{
                  fontSize: Math.max(12, 21 * sealScale * zoom),
                  opacity,
                }}
              >
                {(layer.sealTitle || "REVIEWED").toUpperCase()}
              </div>
              <div
                className="tracking-[0.18em]"
                style={{ fontSize: Math.max(8, 9.5 * sealScale * zoom), opacity }}
              >
                {(layer.sealSubtitle || "DOCUMENT CONTROL").toUpperCase()}
              </div>
              {documentId ? (
                <div style={{ fontSize: Math.max(8, 8.5 * sealScale * zoom), opacity }}>{documentId}</div>
              ) : null}
              {layer.sealShowDate ? (
                <div style={{ fontSize: Math.max(8, 8.5 * sealScale * zoom), opacity }}>
                  {new Date().toISOString().slice(0, 10)}
                </div>
              ) : null}
              <div
                className="mx-auto w-[82%] border-t"
                style={{ borderColor: textColor, opacity: 0.65 }}
              />
            </div>
          );
        }

        if (layer.type === "image") {
          const imageUrl = imageUrls.get(layer.id);

          if (!imageUrl) {
            return null;
          }

          const imageSize = getImageLayerSize(layer);
          const width = imageSize.width * zoom;
          const height = imageSize.height * zoom;
          const position = resolvePreviewWatermarkPosition({
            layer,
            pageWidth,
            pageHeight,
            elementWidth: width,
            elementHeight: height,
            zoom,
            rotation: layer.rotation,
          });

          return (
            <img
              key={layer.id}
              src={imageUrl}
              alt=""
              className="absolute object-contain"
              style={{
                ...position,
                width,
                height,
                opacity,
                objectFit: "contain",
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
