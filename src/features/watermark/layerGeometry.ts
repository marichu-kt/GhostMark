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

export interface ImageRenderPlan extends LayerPlacement {
  naturalWidth: number;
  naturalHeight: number;
}

export interface SealRenderPlan extends LayerPlacement {
  title: string;
  subtitle: string;
  documentId: string;
  dateText: string | null;
  color: string;
  opacity: number;
  borderWidth: number;
  borderRadius: number;
  titleFontSize: number;
  subtitleFontSize: number;
  metaFontSize: number;
  dividerInset: number;
  dividerTop: number;
  dividerBottom: number;
  titleY: number;
  subtitleY: number;
  documentIdY: number;
  dateY: number;
  circular: boolean;
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
  const naturalWidth = Math.max(1, sourceWidth);
  const naturalHeight = Math.max(1, sourceHeight);
  const scaledWidth = naturalWidth * scale;
  const scaledHeight = naturalHeight * scale;
  const minDimension = Math.min(scaledWidth, scaledHeight);
  const minScale = minDimension < 48 ? 48 / Math.max(1, minDimension) : 1;

  return {
    width: scaledWidth * minScale,
    height: scaledHeight * minScale,
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

function getScaledLayer(layer: DocumentLayer, displayScale: number): DocumentLayer {
  return displayScale === 1
    ? layer
    : {
        ...layer,
        x: layer.x * displayScale,
        y: layer.y * displayScale,
      };
}

export function createImageRenderPlan(input: {
  layer: DocumentLayer;
  pageWidth: number;
  pageHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
  displayScale?: number;
}): ImageRenderPlan {
  const { layer, pageWidth, pageHeight, sourceWidth = 260, sourceHeight = sourceWidth, displayScale = 1 } = input;
  const size = getImageLayerSize(layer, sourceWidth, sourceHeight);
  const width = size.width * displayScale;
  const height = size.height * displayScale;
  const placement = resolveLayerPlacement({
    layer: getScaledLayer(layer, displayScale),
    pageWidth,
    pageHeight,
    elementWidth: width,
    elementHeight: height,
    margin: 48 * displayScale,
  });

  return {
    ...placement,
    naturalWidth: Math.max(1, sourceWidth),
    naturalHeight: Math.max(1, sourceHeight),
  };
}

export function createSealRenderPlan(input: {
  layer: DocumentLayer;
  pageWidth: number;
  pageHeight: number;
  displayScale?: number;
  dateText?: string;
}): SealRenderPlan {
  const { layer, pageWidth, pageHeight, displayScale = 1, dateText = new Date().toISOString().slice(0, 10) } = input;
  const sealScale = Math.min(1.8, Math.max(0.55, layer.scale || 1));
  const size = getSealLayerSize(layer);
  const width = size.width * displayScale;
  const height = size.height * displayScale;
  const placement = resolveLayerPlacement({
    layer: getScaledLayer(layer, displayScale),
    pageWidth,
    pageHeight,
    elementWidth: width,
    elementHeight: height,
    margin: 48 * displayScale,
  });
  const title = (layer.sealTitle || "REVIEWED").trim().toUpperCase();
  const subtitle = (layer.sealSubtitle || "DOCUMENT CONTROL").trim().toUpperCase();
  const documentId = layer.sealDocumentId.trim().toUpperCase();
  const scaledSeal = sealScale * displayScale;
  const metaRows = Number(Boolean(documentId)) + Number(layer.sealShowDate);
  const metaStart = height / 2 - (metaRows > 1 ? 32 : 18) * displayScale;

  return {
    ...placement,
    title,
    subtitle,
    documentId,
    dateText: layer.sealShowDate ? dateText : null,
    color: layer.color,
    opacity: layer.opacity,
    borderWidth: Math.max(1, layer.sealBorderThickness * displayScale),
    borderRadius: layer.sealStyle === "circular" ? Math.max(width, height) : 8 * displayScale,
    titleFontSize: Math.max(10 * displayScale, 22 * scaledSeal),
    subtitleFontSize: Math.max(8 * displayScale, 9.5 * scaledSeal),
    metaFontSize: Math.max(8 * displayScale, 8.5 * scaledSeal),
    dividerInset: 14 * displayScale,
    dividerTop: 28 * displayScale,
    dividerBottom: height - 16 * displayScale,
    titleY: height / 2 - 2 * displayScale,
    subtitleY: height / 2 + 16 * displayScale,
    documentIdY: documentId ? metaStart : 0,
    dateY: documentId && layer.sealShowDate ? metaStart + 14 * displayScale : metaStart,
    circular: layer.sealStyle === "circular",
  };
}
