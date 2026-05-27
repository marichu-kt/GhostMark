import { useMemo } from "react";
import type { WatermarkConfig } from "../../types/watermark";

interface WatermarkPreviewOverlayProps {
  config: WatermarkConfig;
  enabled: boolean;
  zoom: number;
  pageWidth: number;
  pageHeight: number;
}

interface PositionStyle {
  left: string;
  top: string;
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

function resolvePosition(config: WatermarkConfig, rotation = 0): PositionStyle {
  if (config.x !== 0 || config.y !== 0) {
    // Preview coordinates approximate pdf-lib placement. PDF export uses a bottom-left
    // origin, while this HTML overlay uses top-left CSS coordinates.
    return {
      left: `${config.x}px`,
      top: `calc(100% - ${config.y}px)`,
      transform: `translate(0, -100%) rotate(${rotation}deg)`,
    };
  }

  const map: Record<typeof config.positionPreset, Pick<PositionStyle, "left" | "top">> = {
    center: { left: "50%", top: "50%" },
    "diagonal-center": { left: "50%", top: "50%" },
    "top-left": { left: "10%", top: "12%" },
    "top-center": { left: "50%", top: "12%" },
    "top-right": { left: "90%", top: "12%" },
    "bottom-left": { left: "10%", top: "88%" },
    "bottom-center": { left: "50%", top: "88%" },
    "bottom-right": { left: "90%", top: "88%" },
  };

  return {
    ...map[config.positionPreset],
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
  };
}

export function WatermarkPreviewOverlay({
  config,
  enabled,
  zoom,
  pageWidth,
  pageHeight,
}: WatermarkPreviewOverlayProps) {
  const imageUrl = useMemo(() => {
    if (config.type !== "image" || !config.imageData || !config.imageMimeType) {
      return null;
    }

    return bytesToDataUrl(config.imageData, config.imageMimeType);
  }, [config.imageData, config.imageMimeType, config.type]);

  if (!enabled || pageWidth <= 0 || pageHeight <= 0) {
    return null;
  }

  const opacity = Math.min(1, Math.max(0, config.opacity));
  const fontSize = Math.max(10, config.fontSize * zoom);
  const textColor = config.color || "#2f343a";
  const baseText = config.text.trim();

  if (config.type === "text" && baseText) {
    const position = resolvePosition(config, config.rotation);

    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute whitespace-nowrap font-bold uppercase tracking-normal"
          style={{
            ...position,
            color: textColor,
            fontSize,
            opacity,
          }}
        >
          {baseText}
        </div>
      </div>
    );
  }

  if (config.type === "pattern" && baseText) {
    const spacingX = Math.max(70, config.patternSpacingX * zoom);
    const spacingY = Math.max(60, config.patternSpacingY * zoom);
    const columns = Math.ceil(pageWidth / spacingX) + 4;
    const rows = Math.ceil(pageHeight / spacingY) + 4;
    const marks = Array.from({ length: rows * columns }, (_, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const stagger = config.patternStaggered && row % 2 === 1 ? spacingX / 2 : 0;

      return {
        key: `${row}-${column}`,
        x: column * spacingX - spacingX + stagger,
        y: row * spacingY - spacingY,
      };
    });

    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {marks.map((mark) => (
          <div
            key={mark.key}
            className="absolute whitespace-nowrap font-bold uppercase"
            style={{
              left: mark.x,
              top: mark.y,
              color: textColor,
              fontSize,
              opacity,
              transform: `rotate(${config.rotation}deg)`,
              transformOrigin: "center",
            }}
          >
            {baseText}
          </div>
        ))}
      </div>
    );
  }

  if (config.type === "classification-banner") {
    const text = (config.classificationText || config.text || "CONFIDENTIAL").trim().toUpperCase();
    const bannerHeight = Math.max(26, fontSize + 14);
    const margin = Math.max(0, config.bannerMargin * zoom);

    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {config.bannerEnabledTop ? (
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
        {config.bannerEnabledBottom ? (
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

  if (config.type === "seal") {
    const position = resolvePosition(config, config.rotation);
    const width = 190 * zoom;
    const height = (config.sealShowDate ? 82 : 66) * zoom;

    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute grid content-center gap-1 border text-center uppercase"
          style={{
            ...position,
            width,
            height,
            borderColor: textColor,
            borderWidth: Math.max(1, config.sealBorderThickness),
            color: textColor,
            opacity,
          }}
        >
          <div className="font-bold" style={{ fontSize: Math.max(12, 18 * zoom) }}>
            {config.sealTitle || "REVIEWED"}
          </div>
          <div style={{ fontSize: Math.max(9, 10 * zoom) }}>
            {config.sealSubtitle || "DOCUMENT CONTROL"}
          </div>
          {config.sealShowDate ? (
            <div style={{ fontSize: Math.max(9, 10 * zoom) }}>{new Date().toISOString().slice(0, 10)}</div>
          ) : null}
        </div>
      </div>
    );
  }

  if (config.type === "image" && imageUrl) {
    const position = resolvePosition(config, config.rotation);
    const width = Math.max(48, 260 * config.scale * zoom);

    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <img
          src={imageUrl}
          alt=""
          className="absolute object-contain"
          style={{
            ...position,
            width,
            opacity,
          }}
        />
      </div>
    );
  }

  return null;
}
