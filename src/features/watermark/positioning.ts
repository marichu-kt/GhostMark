import type { PositionPreset } from "../../types/watermark";

interface PositionInput {
  preset: PositionPreset;
  pageWidth: number;
  pageHeight: number;
  elementWidth: number;
  elementHeight: number;
  customX: number;
  customY: number;
  margin?: number;
}

export function resolveWatermarkPosition({
  preset,
  pageWidth,
  pageHeight,
  elementWidth,
  elementHeight,
  customX,
  customY,
  margin = 48,
}: PositionInput) {
  if (customX !== 0 || customY !== 0) {
    return { x: customX, y: customY };
  }

  const centerX = pageWidth / 2 - elementWidth / 2;
  const centerY = pageHeight / 2 - elementHeight / 2;

  const positions: Record<PositionPreset, { x: number; y: number }> = {
    center: { x: centerX, y: centerY },
    "center-left": { x: margin, y: centerY },
    "center-right": { x: pageWidth - margin - elementWidth, y: centerY },
    "diagonal-center": { x: centerX, y: centerY },
    "top-left": { x: margin, y: pageHeight - margin - elementHeight },
    "top-center": { x: centerX, y: pageHeight - margin - elementHeight },
    "top-right": { x: pageWidth - margin - elementWidth, y: pageHeight - margin - elementHeight },
    "bottom-left": { x: margin, y: margin },
    "bottom-center": { x: centerX, y: margin },
    "bottom-right": { x: pageWidth - margin - elementWidth, y: margin },
  };

  return positions[preset];
}
