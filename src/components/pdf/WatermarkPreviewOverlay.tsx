import { useMemo } from "react";
import type { DocumentLayer } from "../../types/watermark";
import { resolvePageRules } from "../../features/pdf/pageRules";
import {
  createSafeLayerRenderModel,
  SAFELAYER_PREVIEW_PAGE_LIMIT,
} from "../../features/watermark/safelayerRenderer";
import { resolveWatermarkPosition } from "../../features/watermark/positioning";

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
    const position = { x: layer.x * zoom, y: layer.y * zoom };

    return {
      left: position.x,
      top: pageHeight - position.y - elementHeight,
      transform: `rotate(${rotation}deg)`,
    };
  }

  const position = resolveWatermarkPosition({
    preset: layer.positionPreset,
    pageWidth,
    pageHeight,
    elementWidth,
    elementHeight,
    customX: 0,
    customY: 0,
    margin: 48 * zoom,
  });

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

        if (layer.type === "safelayer") {
          if (currentPage > SAFELAYER_PREVIEW_PAGE_LIMIT) {
            return null;
          }

          const model = createSafeLayerRenderModel({
            seed: `${layer.safeLayerSeed || ""}|${layer.id}`,
            text: baseText,
            pageNumber: currentPage,
            width: pageWidth,
            height: pageHeight,
            quality: "preview",
          });
          const toneColor = {
            primary: textColor,
            red: "#d95a58",
            blue: "#47a5d8",
            violet: "#8f74d9",
          };

          return (
            <svg
              key={layer.id}
              className="absolute inset-0"
              width={pageWidth}
              height={pageHeight}
              viewBox={`0 0 ${pageWidth} ${pageHeight}`}
              aria-hidden="true"
              style={{ outline: selected ? "1px solid rgba(198,40,40,0.45)" : undefined }}
            >
              <defs>
                {model.textRows.map((row) => (
                  <path key={row.id} id={row.id} d={row.path} fill="none" />
                ))}
              </defs>
              {model.contourSegments.map((line, index) => (
                <line
                  key={`contour-${index}`}
                  x1={line.start.x}
                  y1={line.start.y}
                  x2={line.end.x}
                  y2={line.end.y}
                  stroke={toneColor[line.tone]}
                  strokeWidth={0.55 * zoom}
                  opacity={line.opacity}
                  strokeLinecap="round"
                />
              ))}
              <g transform={model.textTransform} opacity={model.textOpacity}>
                {model.textRows.map((row) => (
                  <text
                    key={`text-${row.id}`}
                    fill={textColor}
                    opacity={row.opacity}
                    fontSize={model.fontSize}
                    fontWeight={700}
                    letterSpacing="0.02em"
                  >
                    <textPath href={`#${row.id}`} startOffset={row.startOffset}>
                      {row.text}
                    </textPath>
                  </text>
                ))}
              </g>
            </svg>
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
          const width = (layer.sealStyle === "circular" ? 150 : 220) * sealScale * zoom;
          const height = (layer.sealStyle === "circular" ? 150 : 92) * sealScale * zoom;
          const position = resolvePdfLikePosition(layer, pageWidth, pageHeight, width, height, zoom, layer.rotation);
          const documentId = layer.sealDocumentId.trim().toUpperCase();
          const borderWidth = Math.max(1, layer.sealBorderThickness);

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
