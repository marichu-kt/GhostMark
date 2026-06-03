import type { DocumentLayer } from "../../types/watermark";
import { resolveLayerPlacement, type LayerPlacement, type LayerSize } from "./layerGeometry";

export type InteractiveLayerType = "qr" | "barcode" | "signature";
export type InteractionMode = "move" | "resize";

export function isInteractiveLayer(layer: DocumentLayer | null | undefined): layer is DocumentLayer & {
  type: InteractiveLayerType;
} {
  return layer?.type === "qr" || layer?.type === "barcode" || layer?.type === "signature";
}

export function getInteractiveLayerSize(layer: DocumentLayer): LayerSize {
  if (layer.type === "qr") {
    const size = Math.min(260, Math.max(52, layer.qrSize));
    return { width: size, height: size };
  }

  if (layer.type === "barcode") {
    return {
      width: Math.min(420, Math.max(90, layer.barcodeWidth)),
      height: Math.min(180, Math.max(42, layer.barcodeHeight)),
    };
  }

  return {
    width: Math.min(420, Math.max(96, layer.signatureWidth)),
    height: Math.min(180, Math.max(42, layer.signatureHeight)),
  };
}

export function createInteractiveLayerPlacement(input: {
  layer: DocumentLayer;
  pageWidth: number;
  pageHeight: number;
}): LayerPlacement {
  const size = getInteractiveLayerSize(input.layer);

  return resolveLayerPlacement({
    layer: input.layer,
    pageWidth: input.pageWidth,
    pageHeight: input.pageHeight,
    elementWidth: size.width,
    elementHeight: size.height,
  });
}

export function createInteractivePreviewBox(input: {
  layer: DocumentLayer;
  pageWidth: number;
  pageHeight: number;
  zoom: number;
}): LayerPlacement {
  const logicalWidth = input.pageWidth / input.zoom;
  const logicalHeight = input.pageHeight / input.zoom;
  const placement = createInteractiveLayerPlacement({
    layer: input.layer,
    pageWidth: logicalWidth,
    pageHeight: logicalHeight,
  });

  return {
    ...placement,
    x: placement.x * input.zoom,
    y: placement.y * input.zoom,
    top: placement.top * input.zoom,
    width: placement.width * input.zoom,
    height: placement.height * input.zoom,
    centerX: placement.centerX * input.zoom,
    centerY: placement.centerY * input.zoom,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function moveInteractiveLayer(input: {
  layer: DocumentLayer;
  deltaX: number;
  deltaY: number;
  pageWidth: number;
  pageHeight: number;
}): Partial<DocumentLayer> {
  const placement = createInteractiveLayerPlacement({
    layer: input.layer,
    pageWidth: input.pageWidth,
    pageHeight: input.pageHeight,
  });

  const nextX = clamp(placement.x + input.deltaX, 0, Math.max(0, input.pageWidth - placement.width));
  const nextY = clamp(placement.y - input.deltaY, 0, Math.max(0, input.pageHeight - placement.height));

  return {
    positionPreset: "center",
    x: Number(nextX.toFixed(2)),
    y: Number(nextY.toFixed(2)),
  };
}

export function resizeInteractiveLayer(input: {
  layer: DocumentLayer;
  deltaX: number;
  deltaY: number;
  pageWidth: number;
  pageHeight: number;
}): Partial<DocumentLayer> {
  const placement = createInteractiveLayerPlacement({
    layer: input.layer,
    pageWidth: input.pageWidth,
    pageHeight: input.pageHeight,
  });
  const nextWidth = clamp(placement.width + input.deltaX, 48, Math.max(48, input.pageWidth - placement.x));
  const nextHeight = clamp(placement.height + input.deltaY, 36, Math.max(36, input.pageHeight - placement.y));

  if (input.layer.type === "qr") {
    const size = Math.round(clamp(Math.max(nextWidth, nextHeight), 52, 260));
    return { qrSize: size };
  }

  if (input.layer.type === "barcode") {
    return {
      barcodeWidth: Math.round(nextWidth),
      barcodeHeight: Math.round(clamp(nextHeight, 42, 180)),
    };
  }

  return {
    signatureWidth: Math.round(nextWidth),
    signatureHeight: Math.round(clamp(nextHeight, 42, 180)),
  };
}
