import type { DocumentLayer } from "../../types/watermark";
import { resolveLayerPlacement } from "./layerGeometry";

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
  const placement = resolveLayerPlacement({
    layer: { ...layer, x: layer.x * zoom, y: layer.y * zoom },
    pageWidth,
    pageHeight,
    elementWidth,
    elementHeight,
    margin: 48 * zoom,
  });

  return {
    left: placement.x,
    top: placement.top,
    transform: `rotate(${rotation}deg)`,
  };
}
