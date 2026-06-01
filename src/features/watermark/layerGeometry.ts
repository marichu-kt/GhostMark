import type { DocumentLayer } from "../../types/watermark";
import { resolveWatermarkPosition } from "./positioning";

export interface LayerSize {
  width: number;
  height: number;
}

export interface LayerPlacement extends LayerSize {
  x: number;
  y: number;
  top: number;
  centerX: number;
  centerY: number;
  rotation: number;
}

export function estimateLayerTextWidth(text: string, fontSize: number): number {
  return Math.max(fontSize, text.length * fontSize * 0.62);
}

export function getTextLayerSize(layer: DocumentLayer): LayerSize {
  const text = layer.text.trim() || "CONFIDENTIAL";
  return {
    width: estimateLayerTextWidth(text, layer.fontSize),
    height: layer.fontSize,
  };
}

export function getPatternTextSize(layer: DocumentLayer): LayerSize {
  const text = layer.text.trim() || "DRAFT";
  return {
    width: estimateLayerTextWidth(text, layer.fontSize),
    height: layer.fontSize,
  };
}

export function getSealLayerSize(layer: DocumentLayer): LayerSize {
  const sealScale = Math.min(1.8, Math.max(0.55, layer.scale || 1));

  return {
    width: (layer.sealStyle === "circular" ? 150 : 220) * sealScale,
    height: (layer.sealStyle === "circular" ? 150 : 92) * sealScale,
  };
}

export function getImageLayerSize(layer: DocumentLayer, sourceWidth = 260, sourceHeight = sourceWidth): LayerSize {
  const scale = Math.min(2, Math.max(0.05, layer.scale));

  return {
    width: Math.max(48, sourceWidth * scale),
    height: Math.max(48, sourceHeight * scale),
  };
}

export function resolveLayerPlacement(input: {
  layer: DocumentLayer;
  pageWidth: number;
  pageHeight: number;
  elementWidth: number;
  elementHeight: number;
  margin?: number;
}): LayerPlacement {
  const { layer, pageWidth, pageHeight, elementWidth, elementHeight, margin = 48 } = input;
  const position = resolveWatermarkPosition({
    preset: layer.positionPreset,
    pageWidth,
    pageHeight,
    elementWidth,
    elementHeight,
    customX: layer.x,
    customY: layer.y,
    margin,
  });
  const top = pageHeight - position.y - elementHeight;

  return {
    x: position.x,
    y: position.y,
    top,
    width: elementWidth,
    height: elementHeight,
    centerX: position.x + elementWidth / 2,
    centerY: top + elementHeight / 2,
    rotation: layer.rotation,
  };
}
