import type { DocumentLayer } from "../../types/watermark";
import {
  createImageRenderPlan,
  createSealRenderPlan,
  type ImageRenderPlan,
  type SealRenderPlan,
} from "./layerGeometry";

export type CanvasDrawableImage = CanvasImageSource | { width: number; height: number };

function clampOpacity(opacity: number): number {
  return Math.min(1, Math.max(0, opacity));
}

function hexToCss(hex: string): string {
  const normalized = hex.replace("#", "").trim();
  return /^[0-9a-fA-F]{6}$/.test(normalized) ? `#${normalized}` : "#2f343a";
}

function getScale(input: {
  canvasWidth: number;
  canvasHeight: number;
  pageWidth: number;
  pageHeight: number;
  scaleX?: number;
  scaleY?: number;
}) {
  return {
    scaleX: input.scaleX ?? input.canvasWidth / input.pageWidth,
    scaleY: input.scaleY ?? input.canvasHeight / input.pageHeight,
  };
}

export function getCanvasImageDimensions(image: CanvasDrawableImage): { width: number; height: number } {
  const maybeBitmap = image as CanvasDrawableImage & {
    width?: number;
    height?: number;
    naturalWidth?: number;
    naturalHeight?: number;
  };

  return {
    width: Math.max(1, Number(maybeBitmap.naturalWidth ?? maybeBitmap.width ?? 260)),
    height: Math.max(1, Number(maybeBitmap.naturalHeight ?? maybeBitmap.height ?? 260)),
  };
}

export function drawImageWatermarkToCanvas(input: {
  context: CanvasRenderingContext2D;
  layer: DocumentLayer;
  image: CanvasDrawableImage;
  pageWidth: number;
  pageHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  scaleX?: number;
  scaleY?: number;
}): ImageRenderPlan {
  const dimensions = getCanvasImageDimensions(input.image);
  const plan = createImageRenderPlan({
    layer: input.layer,
    pageWidth: input.pageWidth,
    pageHeight: input.pageHeight,
    sourceWidth: dimensions.width,
    sourceHeight: dimensions.height,
  });
  const { scaleX, scaleY } = getScale(input);

  input.context.save();
  input.context.globalAlpha = clampOpacity(plan.opacity);
  input.context.translate(plan.centerX * scaleX, plan.centerY * scaleY);
  input.context.rotate((plan.rotation * Math.PI) / 180);
  input.context.drawImage(
    input.image as CanvasImageSource,
    (-plan.width * scaleX) / 2,
    (-plan.height * scaleY) / 2,
    plan.width * scaleX,
    plan.height * scaleY,
  );
  input.context.restore();

  return plan;
}

export function drawSealWatermarkToCanvas(input: {
  context: CanvasRenderingContext2D;
  layer: DocumentLayer;
  pageWidth: number;
  pageHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  scaleX?: number;
  scaleY?: number;
  dateText?: string;
}): SealRenderPlan {
  const plan = createSealRenderPlan({
    layer: input.layer,
    pageWidth: input.pageWidth,
    pageHeight: input.pageHeight,
    dateText: input.dateText,
  });
  const { scaleX, scaleY } = getScale(input);
  const x = plan.x * scaleX;
  const y = plan.top * scaleY;
  const width = plan.width * scaleX;
  const height = plan.height * scaleY;
  const scaledY = (value: number) => value * scaleY;

  input.context.save();
  input.context.translate(x + width / 2, y + height / 2);
  input.context.rotate((plan.rotation * Math.PI) / 180);
  input.context.globalAlpha = clampOpacity(plan.opacity);
  input.context.strokeStyle = hexToCss(plan.color);
  input.context.fillStyle = hexToCss(plan.color);
  input.context.lineWidth = Math.max(1, plan.borderWidth * scaleX);

  if (plan.circular) {
    input.context.beginPath();
    input.context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
    input.context.stroke();
    input.context.globalAlpha = clampOpacity(plan.opacity * 0.7);
    input.context.beginPath();
    input.context.ellipse(
      0,
      0,
      Math.max(1, width / 2 - 10 * scaleX),
      Math.max(1, height / 2 - 10 * scaleY),
      0,
      0,
      Math.PI * 2,
    );
    input.context.stroke();
  } else {
    input.context.strokeRect(-width / 2, -height / 2, width, height);
    input.context.globalAlpha = clampOpacity(plan.opacity * 0.75);
    input.context.fillRect(
      -width / 2 + plan.dividerInset * scaleX,
      -height / 2 + plan.dividerTop * scaleY,
      width - plan.dividerInset * 2 * scaleX,
      Math.max(1, plan.borderWidth * 0.55 * scaleY),
    );
    input.context.fillRect(
      -width / 2 + plan.dividerInset * scaleX,
      -height / 2 + plan.dividerBottom * scaleY,
      width - plan.dividerInset * 2 * scaleX,
      Math.max(1, plan.borderWidth * 0.55 * scaleY),
    );
  }

  input.context.globalAlpha = clampOpacity(plan.opacity);
  input.context.textAlign = "center";
  input.context.textBaseline = "middle";
  input.context.fillStyle = hexToCss(plan.color);
  input.context.font = `700 ${scaledY(plan.titleFontSize)}px Arial, sans-serif`;
  input.context.fillText(plan.title, 0, -height / 2 + plan.titleY * scaleY);
  input.context.font = `500 ${scaledY(plan.subtitleFontSize)}px Arial, sans-serif`;
  input.context.fillText(plan.subtitle, 0, -height / 2 + plan.subtitleY * scaleY);

  if (plan.documentId) {
    input.context.font = `500 ${scaledY(plan.metaFontSize)}px Arial, sans-serif`;
    input.context.fillText(plan.documentId, 0, -height / 2 + plan.documentIdY * scaleY);
  }

  if (plan.dateText) {
    input.context.font = `500 ${scaledY(plan.metaFontSize)}px Arial, sans-serif`;
    input.context.fillText(plan.dateText, 0, -height / 2 + plan.dateY * scaleY);
  }

  input.context.restore();

  return plan;
}
