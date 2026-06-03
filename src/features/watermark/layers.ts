import type { DocumentLayer, LayerType } from "../../types/watermark";

export function getEnabledLayers(layers: DocumentLayer[]): DocumentLayer[] {
  return layers.filter((layer) => layer.enabled);
}

export function getLayerTypeLabel(type: LayerType): string {
  if (type === "safelayer") {
    return "SafeLayer";
  }

  if (type === "qr") {
    return "QR";
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function getDefaultLayerName(type: LayerType): string {
  return getLayerTypeLabel(type);
}

export function getLayerDisplayName(layer: DocumentLayer): string {
  if (layer.name.trim()) {
    return layer.name.trim();
  }

  return getLayerTypeLabel(layer.type);
}

export function duplicateLayer(layer: DocumentLayer): DocumentLayer {
  return {
    ...layer,
    id: crypto.randomUUID(),
    name: `${getLayerDisplayName(layer)} copy`,
    imageData: layer.imageData ? new Uint8Array(layer.imageData) : undefined,
    blackoutRects: layer.blackoutRects.map((rect) => ({ ...rect, id: crypto.randomUUID() })),
    signatureStrokes: layer.signatureStrokes.map((stroke) => ({
      ...stroke,
      id: crypto.randomUUID(),
      points: stroke.points.map((point) => ({ ...point })),
    })),
  };
}
