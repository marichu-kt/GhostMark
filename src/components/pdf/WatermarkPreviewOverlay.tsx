import { useMemo } from "react";
import type { DocumentLayer } from "../../types/watermark";
import { resolvePageRules } from "../../features/pdf/pageRules";
import { createSafeLayerPattern } from "../../features/watermark/safelayerPattern";
import {
  getSealInkProfile,
  getSealInkSegments,
  getSealSeed,
} from "../../features/watermark/sealInk";

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

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(47,52,58,${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red},${green},${blue},${alpha})`;
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

function getSealSegmentCoordinates(
  side: "top" | "right" | "bottom" | "left",
  startRatio: number,
  endRatio: number,
  offset: number,
  width: number,
  height: number,
) {
  switch (side) {
    case "top":
      return {
        x1: startRatio * width,
        y1: offset,
        x2: endRatio * width,
        y2: offset,
      };
    case "right":
      return {
        x1: width + offset,
        y1: startRatio * height,
        x2: width + offset,
        y2: endRatio * height,
      };
    case "bottom":
      return {
        x1: startRatio * width,
        y1: height + offset,
        x2: endRatio * width,
        y2: height + offset,
      };
    case "left":
      return {
        x1: offset,
        y1: startRatio * height,
        x2: offset,
        y2: endRatio * height,
      };
    default:
      return { x1: 0, y1: 0, x2: width, y2: 0 };
  }
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
            density: layer.safeLayerDensity,
            distortion: layer.safeLayerDistortion,
            width: pageWidth,
            height: pageHeight,
            opacity,
            textSpacing: layer.safeLayerTextSpacing * zoom,
            lineSpacing: layer.safeLayerLineSpacing * zoom,
            waveStrength: layer.safeLayerWaveStrength * zoom,
            contourStrength: layer.safeLayerContourStrength * zoom,
          });

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
                  stroke={textColor}
                  strokeWidth={0.8 * zoom}
                  opacity={line.opacity}
                />
              ))}
              {pattern.contourLines.map((line, index) => (
                <polyline
                  key={`contour-${index}`}
                  points={pointsToSvg(line.points, pageHeight)}
                  fill="none"
                  stroke={textColor}
                  strokeWidth={0.65 * zoom}
                  opacity={line.opacity}
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
          const sealInkStyle = layer.sealInkStyle ?? "clean";
          const inkProfile = getSealInkProfile(sealInkStyle);
          const inkSeed = getSealSeed({
            id: layer.id,
            title: layer.sealTitle,
            subtitle: layer.sealSubtitle,
            documentId,
          });
          const inkSegments =
            sealInkStyle !== "clean" && layer.sealStyle !== "circular"
              ? getSealInkSegments(sealInkStyle, inkSeed)
              : [];
          const borderWidth = Math.max(1, layer.sealBorderThickness);
          const textOpacity = opacity * inkProfile.textOpacity;
          const ghostOpacity = opacity * inkProfile.ghostOpacity;

          return (
            <div
              key={layer.id}
              className="absolute grid content-center gap-1 text-center uppercase"
              style={{
                ...position,
                width,
                height,
                borderColor: inkSegments.length ? "transparent" : textColor,
                borderWidth,
                borderStyle: "solid",
                borderRadius: layer.sealStyle === "circular" ? "9999px" : 8 * zoom,
                color: textColor,
                opacity,
                transformOrigin: "center",
                filter: sealInkStyle === "faded-ink" ? "saturate(0.84)" : undefined,
              }}
            >
              {inkSegments.length ? (
                <svg
                  className="absolute inset-0 overflow-visible"
                  width={width}
                  height={height}
                  viewBox={`0 0 ${width} ${height}`}
                  aria-hidden="true"
                >
                  {inkSegments.map((segment, index) => {
                    const line = getSealSegmentCoordinates(
                      segment.side,
                      segment.startRatio,
                      segment.endRatio,
                      segment.offset * zoom,
                      width,
                      height,
                    );

                    return (
                      <line
                        key={`${segment.side}-${index}`}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        stroke={textColor}
                        strokeWidth={borderWidth}
                        strokeLinecap="butt"
                        opacity={Math.min(1, opacity * segment.opacity)}
                      />
                    );
                  })}
                </svg>
              ) : null}
              <div
                className="mx-auto w-[82%] border-b"
                style={{ borderColor: textColor, opacity: 0.65 * inkProfile.borderOpacity }}
              />
              <div
                className="relative font-bold tracking-[0.08em]"
                style={{
                  fontSize: Math.max(12, 21 * sealScale * zoom),
                  opacity: textOpacity,
                  textShadow: ghostOpacity
                    ? `${0.75 * zoom}px ${0.35 * zoom}px 0 ${hexToRgba(textColor, ghostOpacity)}`
                    : undefined,
                }}
              >
                {(layer.sealTitle || "REVIEWED").toUpperCase()}
              </div>
              <div
                className="tracking-[0.18em]"
                style={{ fontSize: Math.max(8, 9.5 * sealScale * zoom), opacity: textOpacity }}
              >
                {(layer.sealSubtitle || "DOCUMENT CONTROL").toUpperCase()}
              </div>
              {documentId ? (
                <div style={{ fontSize: Math.max(8, 8.5 * sealScale * zoom), opacity: textOpacity }}>{documentId}</div>
              ) : null}
              {layer.sealShowDate ? (
                <div style={{ fontSize: Math.max(8, 8.5 * sealScale * zoom), opacity: textOpacity }}>
                  {new Date().toISOString().slice(0, 10)}
                </div>
              ) : null}
              <div
                className="mx-auto w-[82%] border-t"
                style={{ borderColor: textColor, opacity: 0.65 * inkProfile.borderOpacity }}
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
