import type { DocumentLayer } from "../../types/watermark";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import {
  createImageRenderPlan,
  createSealRenderPlan,
  type ImageRenderPlan,
  type LayerPlacement,
  type SealRenderPlan,
} from "./layerGeometry";
import { createInteractiveLayerPlacement as createSpecialPlacement } from "./interactiveGeometry";

export type CanvasDrawableImage = CanvasImageSource | { width: number; height: number };

function clampOpacity(opacity: number): number {
  return Math.min(1, Math.max(0, opacity));
}

function hexToCss(hex: string): string {
  const normalized = hex.replace("#", "").trim();
  return /^[0-9a-fA-F]{6}$/.test(normalized) ? `#${normalized}` : "#2f343a";
}

function drawRotatedBox(input: {
  context: CanvasRenderingContext2D;
  placement: LayerPlacement;
  scaleX: number;
  scaleY: number;
  opacity: number;
  rotation: number;
  draw: (width: number, height: number) => void;
}) {
  input.context.save();
  input.context.translate(input.placement.centerX * input.scaleX, input.placement.centerY * input.scaleY);
  input.context.rotate((input.rotation * Math.PI) / 180);
  input.context.globalAlpha = clampOpacity(input.opacity);
  input.draw(input.placement.width * input.scaleX, input.placement.height * input.scaleY);
  input.context.restore();
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

function traceRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const resolvedRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + resolvedRadius, y);
  context.lineTo(x + width - resolvedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + resolvedRadius);
  context.lineTo(x + width, y + height - resolvedRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - resolvedRadius, y + height);
  context.lineTo(x + resolvedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - resolvedRadius);
  context.lineTo(x, y + resolvedRadius);
  context.quadraticCurveTo(x, y, x + resolvedRadius, y);
  context.closePath();
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
    traceRoundedRect(input.context, -width / 2, -height / 2, width, height, plan.borderRadius * scaleX);
    input.context.stroke();
    input.context.globalAlpha = clampOpacity(plan.opacity * 0.75);
    input.context.lineWidth = Math.max(1, plan.borderWidth * 0.65 * scaleX);
    traceRoundedRect(
      input.context,
      -width / 2 + plan.innerInset * scaleX,
      -height / 2 + plan.innerInset * scaleY,
      width - plan.innerInset * 2 * scaleX,
      height - plan.innerInset * 2 * scaleY,
      Math.max(2, (plan.borderRadius - plan.innerInset / 2) * scaleX),
    );
    input.context.stroke();
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

export function drawQrWatermarkToCanvas(input: {
  context: CanvasRenderingContext2D;
  layer: DocumentLayer;
  pageWidth: number;
  pageHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  scaleX?: number;
  scaleY?: number;
}): LayerPlacement | null {
  const content = input.layer.qrContent.trim();

  if (!content) {
    return null;
  }

  const placement = createSpecialPlacement({
    layer: input.layer,
    pageWidth: input.pageWidth,
    pageHeight: input.pageHeight,
  });
  const { scaleX, scaleY } = getScale(input);
  const qr = QRCode.create(content, { errorCorrectionLevel: "M" });
  const moduleCount = qr.modules.size;
  const quietZone = 4;
  const totalModules = moduleCount + quietZone * 2;
  const color = hexToCss(input.layer.color);

  drawRotatedBox({
    context: input.context,
    placement,
    scaleX,
    scaleY,
    opacity: input.layer.opacity,
    rotation: input.layer.rotation,
    draw: (width, height) => {
      const moduleSize = Math.min(width, height) / totalModules;
      const originX = -width / 2 + (width - moduleSize * totalModules) / 2 + quietZone * moduleSize;
      const originY = -height / 2 + (height - moduleSize * totalModules) / 2 + quietZone * moduleSize;

      input.context.fillStyle = "#ffffff";
      input.context.fillRect(-width / 2, -height / 2, width, height);
      input.context.fillStyle = color;

      for (let row = 0; row < moduleCount; row += 1) {
        for (let column = 0; column < moduleCount; column += 1) {
          if (qr.modules.get(row, column)) {
            input.context.fillRect(
              originX + column * moduleSize,
              originY + row * moduleSize,
              Math.ceil(moduleSize),
              Math.ceil(moduleSize),
            );
          }
        }
      }
    },
  });

  return placement;
}

export function drawBarcodeWatermarkToCanvas(input: {
  context: CanvasRenderingContext2D;
  layer: DocumentLayer;
  pageWidth: number;
  pageHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  scaleX?: number;
  scaleY?: number;
}): LayerPlacement | null {
  const value = input.layer.barcodeValue.trim();

  if (!value) {
    return null;
  }

  const placement = createSpecialPlacement({
    layer: input.layer,
    pageWidth: input.pageWidth,
    pageHeight: input.pageHeight,
  });
  const { scaleX, scaleY } = getScale(input);

  drawRotatedBox({
    context: input.context,
    placement,
    scaleX,
    scaleY,
    opacity: input.layer.opacity,
    rotation: input.layer.rotation,
    draw: (width, height) => {
      const barcodeCanvas = document.createElement("canvas");
      barcodeCanvas.width = Math.max(1, Math.round(width));
      barcodeCanvas.height = Math.max(1, Math.round(height));

      try {
        JsBarcode(barcodeCanvas, value, {
          format: input.layer.barcodeFormat,
          width: Math.max(1, width / Math.max(60, value.length * 9)),
          height: Math.max(24, height - 12),
          displayValue: false,
          margin: 6,
          background: "#ffffff",
          lineColor: hexToCss(input.layer.color),
        });
        input.context.drawImage(barcodeCanvas, -width / 2, -height / 2, width, height);
      } catch {
        input.context.fillStyle = hexToCss(input.layer.color);
        input.context.font = `600 ${Math.max(10, height * 0.22)}px Arial, sans-serif`;
        input.context.textAlign = "center";
        input.context.textBaseline = "middle";
        input.context.fillText(value, 0, 0, width);
      }
    },
  });

  return placement;
}

function signatureJitter(seed: number): number {
  const raw = Math.sin(seed * 13.37) * 10000;
  return raw - Math.floor(raw);
}

export function drawSignatureWatermarkToCanvas(input: {
  context: CanvasRenderingContext2D;
  layer: DocumentLayer;
  pageWidth: number;
  pageHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  scaleX?: number;
  scaleY?: number;
}): LayerPlacement | null {
  const hasDrawing = input.layer.signatureStrokes.some((stroke) => stroke.points.length > 1);
  const text = input.layer.signatureText.trim();

  if (input.layer.signatureMode === "typed" && !text) {
    return null;
  }

  if (input.layer.signatureMode === "drawn" && !hasDrawing) {
    return null;
  }

  const placement = createSpecialPlacement({
    layer: input.layer,
    pageWidth: input.pageWidth,
    pageHeight: input.pageHeight,
  });
  const { scaleX, scaleY } = getScale(input);
  const color = hexToCss(input.layer.color);

  drawRotatedBox({
    context: input.context,
    placement,
    scaleX,
    scaleY,
    opacity: input.layer.opacity,
    rotation: input.layer.rotation,
    draw: (width, height) => {
      input.context.strokeStyle = color;
      input.context.fillStyle = color;
      input.context.lineCap = "round";
      input.context.lineJoin = "round";

      if (input.layer.signatureMode === "drawn") {
        input.context.lineWidth = Math.max(1.5, Math.min(width, height) * 0.035);
        for (const stroke of input.layer.signatureStrokes) {
          if (stroke.points.length < 2) {
            continue;
          }

          input.context.beginPath();
          stroke.points.forEach((point, index) => {
            const x = -width / 2 + point.x * width;
            const y = -height / 2 + point.y * height;
            if (index === 0) {
              input.context.moveTo(x, y);
            } else {
              input.context.lineTo(x, y);
            }
          });
          input.context.stroke();
        }
        return;
      }

      const baseFontSize = Math.max(26, height * (input.layer.signatureStyle === "compact" ? 0.48 : 0.58));
      const slant = input.layer.signatureStyle === "formal" ? -0.15 : -0.08;
      const fontStack = `"Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive`;

      input.context.save();
      input.context.transform(1, 0, slant, 1, 0, 0);
      input.context.textBaseline = "middle";
      input.context.textAlign = "center";
      input.context.font = `${input.layer.signatureStyle === "formal" ? 500 : 600} ${baseFontSize}px ${fontStack}`;
      input.context.fillText(text, 0, -height * 0.03, width * 0.92);
      input.context.restore();

      input.context.globalAlpha = clampOpacity(input.layer.opacity * 0.7);
      input.context.lineWidth = Math.max(1, height * 0.018);
      input.context.beginPath();
      input.context.moveTo(-width * 0.32, height * 0.28);
      input.context.bezierCurveTo(
        -width * 0.08,
        height * (0.31 + signatureJitter(text.length) * 0.03),
        width * 0.18,
        height * (0.19 + signatureJitter(text.length + 1) * 0.04),
        width * 0.38,
        height * 0.26,
      );
      input.context.stroke();
    },
  });

  return placement;
}
