import { useMemo } from "react";
import type { DocumentLayer } from "../../types/watermark";
import { resolvePageRules } from "../../features/pdf/pageRules";

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

interface PositionStyle {
  left: number;
  top: number;
  transform: string;
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

function estimateTextWidth(text: string, fontSize: number): number {
  return Math.max(fontSize, text.length * fontSize * 0.62);
}

function resolvePdfLikePosition(
  layer: DocumentLayer,
  pageWidth: number,
  pageHeight: number,
  elementWidth: number,
  elementHeight: number,
  zoom: number,
  rotation = 0,
): PositionStyle {
  if (layer.x !== 0 || layer.y !== 0) {
    // Preview coordinates approximate pdf-lib placement. PDF export uses a bottom-left
    // origin, while this HTML overlay uses top-left CSS coordinates.
    const x = layer.x * zoom;
    const y = layer.y * zoom;
    return {
      left: x,
      top: pageHeight - y - elementHeight,
      transform: `rotate(${rotation}deg)`,
    };
  }

  const margin = 48 * zoom;
  const map: Record<typeof layer.positionPreset, { x: number; y: number }> = {
    center: { x: pageWidth / 2 - elementWidth / 2, y: pageHeight / 2 - elementHeight / 2 },
    "diagonal-center": { x: pageWidth / 2 - elementWidth / 2, y: pageHeight / 2 - elementHeight / 2 },
    "top-left": { x: margin, y: pageHeight - margin - elementHeight },
    "top-center": { x: pageWidth / 2 - elementWidth / 2, y: pageHeight - margin - elementHeight },
    "top-right": { x: pageWidth - margin - elementWidth, y: pageHeight - margin - elementHeight },
    "bottom-left": { x: margin, y: margin },
    "bottom-center": { x: pageWidth / 2 - elementWidth / 2, y: margin },
    "bottom-right": { x: pageWidth - margin - elementWidth, y: margin },
  };
  const position = map[layer.positionPreset];

  return {
    left: position.x,
    top: pageHeight - position.y - elementHeight,
    transform: `rotate(${rotation}deg)`,
  };
}

function layerAppliesToPage(layer: DocumentLayer, pageIndex: number, totalPages: number): boolean {
  try {
    const selectedPages = resolvePageRules(layer.pages, totalPages);
    return selectedPages.includes(pageIndex);
  } catch {
    return false;
  }
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
          const elementWidth = estimateTextWidth(baseText, fontSize);
          const elementHeight = fontSize;
          const position = resolvePdfLikePosition(
            layer,
            pageWidth,
            pageHeight,
            elementWidth,
            elementHeight,
            zoom,
            layer.rotation,
          );

          return (
            <div
              key={layer.id}
              className="absolute whitespace-nowrap font-bold uppercase tracking-normal"
              style={{
                ...position,
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

        if (layer.type === "classification-banner") {
          const text = (layer.classificationText || layer.text || "CONFIDENTIAL").trim().toUpperCase();
          const bannerHeight = Math.max(26, fontSize + 14);
          const margin = Math.max(0, layer.bannerMargin * zoom);

          return (
            <div key={layer.id}>
              {layer.bannerEnabledTop ? (
                <div
                  className="absolute left-0 right-0 flex items-center justify-center border-y font-bold uppercase"
                  style={{
                    top: margin,
                    height: bannerHeight,
                    marginInline: margin,
                    borderColor: "rgba(125, 52, 50, 0.85)",
                    background: "rgba(125, 52, 50, 0.1)",
                    color: "#7d3432",
                    fontSize,
                    opacity,
                  }}
                >
                  {text}
                </div>
              ) : null}
              {layer.bannerEnabledBottom ? (
                <div
                  className="absolute left-0 right-0 flex items-center justify-center border-y font-bold uppercase"
                  style={{
                    bottom: margin,
                    height: bannerHeight,
                    marginInline: margin,
                    borderColor: "rgba(125, 52, 50, 0.85)",
                    background: "rgba(125, 52, 50, 0.1)",
                    color: "#7d3432",
                    fontSize,
                    opacity,
                  }}
                >
                  {text}
                </div>
              ) : null}
            </div>
          );
        }

        if (layer.type === "seal") {
          const width = 190 * zoom;
          const height = (layer.sealShowDate ? 82 : 66) * zoom;
          const position = resolvePdfLikePosition(layer, pageWidth, pageHeight, width, height, zoom, layer.rotation);

          return (
            <div
              key={layer.id}
              className="absolute grid content-center gap-1 border text-center uppercase"
              style={{
                ...position,
                width,
                height,
                borderColor: textColor,
                borderWidth: Math.max(1, layer.sealBorderThickness),
                color: textColor,
                opacity,
                transformOrigin: "center",
              }}
            >
              <div className="font-bold" style={{ fontSize: Math.max(12, 18 * zoom) }}>
                {layer.sealTitle || "REVIEWED"}
              </div>
              <div style={{ fontSize: Math.max(9, 10 * zoom) }}>
                {layer.sealSubtitle || "DOCUMENT CONTROL"}
              </div>
              {layer.sealShowDate ? (
                <div style={{ fontSize: Math.max(9, 10 * zoom) }}>{new Date().toISOString().slice(0, 10)}</div>
              ) : null}
            </div>
          );
        }

        if (layer.type === "image") {
          const imageUrl = imageUrls.get(layer.id);

          if (!imageUrl) {
            return null;
          }

          const width = Math.max(48, 260 * layer.scale * zoom);
          const height = width;
          const position = resolvePdfLikePosition(layer, pageWidth, pageHeight, width, height, zoom, layer.rotation);

          return (
            <img
              key={layer.id}
              src={imageUrl}
              alt=""
              className="absolute object-contain"
              style={{
                ...position,
                width,
                opacity,
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
