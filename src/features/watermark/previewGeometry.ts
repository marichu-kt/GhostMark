import type { DocumentLayer } from "../../types/watermark";
import { resolveWatermarkPosition } from "./positioning";

export interface PreviewPositionStyle {
  left: number;
  top: number;
  transform: string;
}

export function resolvePreviewWatermarkPosition(input: {
  layer: DocumentLayer;
  pageWidth: number;
  pageHeight: number;
  elementWidth: number;
  elementHeight: number;
  zoom: number;
  rotation?: number;
}): PreviewPositionStyle {
  const { layer, pageWidth, pageHeight, elementWidth, elementHeight, zoom, rotation = 0 } = input;
  const scaledCustomX = layer.x * zoom;
  const scaledCustomY = layer.y * zoom;
  const position =
    layer.x !== 0 || layer.y !== 0
      ? { x: scaledCustomX, y: scaledCustomY }
      : resolveWatermarkPosition({
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
