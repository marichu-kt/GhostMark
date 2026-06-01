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
  pageWidth: number;
  pageHeight: number;
  naturalWidth: number;
  naturalHeight: number;
  aspectRatio: number;
  opacity: number;
  scale: number;
  rotationOrigin: "center";
  anchor: "center";
  position: DocumentLayer["positionPreset"];
}

export interface SealRenderPlan extends LayerPlacement {
  pageWidth: number;
  pageHeight: number;
  title: string;
  subtitle: string;
  documentId: string;
  dateText: string | null;
  color: string;
  opacity: number;
  borderWidth: number;
  borderRadius: number;
  scale: number;
  rotationOrigin: "center";
  anchor: "center";
  position: DocumentLayer["positionPreset"];
  shape: DocumentLayer["sealStyle"];
  titleFontSize: number;
  subtitleFontSize: number;
  metaFontSize: number;
  dividerInset: number;
  innerInset: number;
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
    width: (layer.sealStyle === "circular" ? 172 : 236) * sealScale,
    height: (layer.sealStyle === "circular" ? 172 : 108) * sealScale,
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

export function createImageRenderPlan(input: {
  layer: DocumentLayer;
  pageWidth: number;
  pageHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
}): ImageRenderPlan {
  const { layer, pageWidth, pageHeight, sourceWidth = 260, sourceHeight = sourceWidth } = input;
  const size = getImageLayerSize(layer, sourceWidth, sourceHeight);
  const placement = resolveLayerPlacement({
    layer,
    pageWidth,
    pageHeight,
    elementWidth: size.width,
    elementHeight: size.height,
  });
  const naturalWidth = Math.max(1, sourceWidth);
  const naturalHeight = Math.max(1, sourceHeight);

  return {
    ...placement,
    pageWidth,
    pageHeight,
    naturalWidth,
    naturalHeight,
    aspectRatio: naturalWidth / naturalHeight,
    opacity: layer.opacity,
    scale: Math.min(2, Math.max(0.05, layer.scale)),
    rotationOrigin: "center",
    anchor: "center",
    position: layer.positionPreset,
  };
}

export function createSealRenderPlan(input: {
  layer: DocumentLayer;
  pageWidth: number;
  pageHeight: number;
  dateText?: string;
}): SealRenderPlan {
  const { layer, pageWidth, pageHeight, dateText = new Date().toISOString().slice(0, 10) } = input;
  const sealScale = Math.min(1.8, Math.max(0.55, layer.scale || 1));
  const size = getSealLayerSize(layer);
  const placement = resolveLayerPlacement({
    layer,
    pageWidth,
    pageHeight,
    elementWidth: size.width,
    elementHeight: size.height,
  });
  const title = (layer.sealTitle || "REVIEWED").trim().toUpperCase();
  const subtitle = (layer.sealSubtitle || "DOCUMENT CONTROL").trim().toUpperCase();
  const documentId = layer.sealDocumentId.trim().toUpperCase();
  const metaRows = Number(Boolean(documentId)) + Number(layer.sealShowDate);
  const isCircular = layer.sealStyle === "circular";
  const metaStart = size.height * (isCircular ? 0.68 : 0.73) - (metaRows > 1 ? 5 * sealScale : 0);

  return {
    ...placement,
    pageWidth,
    pageHeight,
    title,
    subtitle,
    documentId,
    dateText: layer.sealShowDate ? dateText : null,
    color: layer.color,
    opacity: layer.opacity,
    borderWidth: Math.max(1, layer.sealBorderThickness),
    borderRadius: isCircular ? Math.max(size.width, size.height) : 10 * sealScale,
    scale: sealScale,
    rotationOrigin: "center",
    anchor: "center",
    position: layer.positionPreset,
    shape: layer.sealStyle,
    titleFontSize: Math.max(11, (isCircular ? 20 : 24) * sealScale),
    subtitleFontSize: Math.max(8, (isCircular ? 9 : 10) * sealScale),
    metaFontSize: Math.max(8, (isCircular ? 8 : 8.5) * sealScale),
    dividerInset: (isCircular ? 26 : 18) * sealScale,
    innerInset: (isCircular ? 13 : 7) * sealScale,
    dividerTop: size.height * (isCircular ? 0.34 : 0.31),
    dividerBottom: size.height * (isCircular ? 0.63 : 0.66),
    titleY: size.height * (isCircular ? 0.47 : 0.46),
    subtitleY: size.height * (isCircular ? 0.58 : 0.6),
    documentIdY: documentId ? metaStart : 0,
    dateY: documentId && layer.sealShowDate ? metaStart + 12 * sealScale : metaStart,
    circular: isCircular,
  };
}
