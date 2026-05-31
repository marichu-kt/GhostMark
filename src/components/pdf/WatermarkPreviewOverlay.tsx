import { useMemo } from "react";
import type { DocumentLayer } from "../../types/watermark";
import { resolvePageRules } from "../../features/pdf/pageRules";
import { createSafeLayerPattern } from "../../features/watermark/safelayerPattern";

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
    "center-left": { x: margin, y: pageHeight / 2 - elementHeight / 2 },
    "center-right": { x: pageWidth - margin - elementWidth, y: pageHeight / 2 - elementHeight / 2 },
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

function pointsToSvg(points: Array<{ x: number; y: number }>, pageHeight: number): string {
  return points.map((point) => `${point.x},${pageHeight - point.y}`).join(" ");
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

        if (layer.type === "safelayer" && baseText) {
          const pattern = createSafeLayerPattern({
            seed: layer.safeLayerSeed || layer.id,
            text: baseText,
            style: layer.safeLayerStyle,
            distortion: layer.safeLayerDistortion,
            width: pageWidth,
            height: pageHeight,
            opacity,
            rotation: layer.rotation,
            textSpacing: layer.safeLayerTextSpacing * zoom,
            lineSpacing: layer.safeLayerLineSpacing * zoom,
            waveStrength: layer.safeLayerWaveStrength * zoom,
            contourStrength: layer.safeLayerContourStrength * zoom,
            holographicIntensity: layer.safeLayerHolographicIntensity,
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
              {pattern.waveLines.map((line, index) => (
                <polyline
                  key={`wave-${index}`}
                  points={pointsToSvg(line.points, pageHeight)}
                  fill="none"
                  stroke={toneColor[line.tone ?? "primary"]}
                  strokeWidth={0.8 * zoom}
                  opacity={line.opacity}
                />
              ))}
              {pattern.contourLines.map((line, index) => (
                <polyline
                  key={`contour-${index}`}
                  points={pointsToSvg(line.points, pageHeight)}
                  fill="none"
                  stroke={toneColor[line.tone ?? "primary"]}
                  strokeWidth={0.65 * zoom}
                  opacity={line.opacity}
                />
              ))}
              {pattern.holographicLines.map((line, index) => (
                <polyline
                  key={`holo-${index}`}
                  points={pointsToSvg(line.points, pageHeight)}
                  fill="none"
                  stroke={toneColor[line.tone ?? "blue"]}
                  strokeWidth={1.1 * zoom}
                  opacity={line.opacity}
                  strokeLinecap="round"
                />
              ))}
              {pattern.textMarks.map((mark, index) => (
                <text
                  key={`text-${index}`}
                  x={mark.x}
                  y={pageHeight - mark.y}
                  fill={textColor}
                  opacity={mark.opacity}
                  fontSize={Math.max(8, layer.fontSize * zoom)}
                  fontWeight={700}
                  textAnchor="middle"
                  transform={`rotate(${mark.rotation} ${mark.x} ${pageHeight - mark.y})`}
                >
                  {mark.text}
                </text>
              ))}
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
