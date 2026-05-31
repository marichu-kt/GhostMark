import {
  degrees,
  PDFDocument,
  PDFImage,
  PDFPage,
  rgb,
  StandardFonts,
  type PDFFont,
  type RGB,
} from "pdf-lib";
import type { DocumentLayer, WatermarkConfig } from "../../types/watermark";
import { resolveWatermarkPosition } from "../watermark/positioning";
import { createSafeLayerPattern } from "../watermark/safelayerPattern";
import { sanitizePdfMetadata } from "./metadataSanitizer";
import { resolvePageRules } from "./pageRules";
import { renderPdfPageToCanvas } from "./renderPdfPreview";

interface ApplyWatermarkOptions {
  cleanupMetadata?: boolean;
  onProgress?: (progress: { current: number; total: number }) => void;
}

const FLATTENED_EXPORT_SCALE = 1.65;
const MAX_EXPORT_CANVAS_PIXELS = 18_000_000;

function parseHexColor(hex: string): RGB {
  const normalized = hex.replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return rgb(0.18, 0.2, 0.23);
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  return rgb(red, green, blue);
}

function clampOpacity(opacity: number): number {
  return Math.min(1, Math.max(0, opacity));
}

function pdfYToCanvas(y: number, elementHeight: number, canvasHeight: number, scaleY: number): number {
  return canvasHeight - (y + elementHeight) * scaleY;
}

function hexToCss(hex: string): string {
  const normalized = hex.replace("#", "").trim();
  return /^[0-9a-fA-F]{6}$/.test(normalized) ? `#${normalized}` : "#2f343a";
}

function setCanvasAlphaColor(context: CanvasRenderingContext2D, hex: string, opacity: number) {
  context.globalAlpha = clampOpacity(opacity);
  context.fillStyle = hexToCss(hex);
  context.strokeStyle = hexToCss(hex);
}

function drawCanvasRotatedText(input: {
  context: CanvasRenderingContext2D;
  text: string;
  x: number;
  y: number;
  font: string;
  color: string;
  opacity: number;
  rotation: number;
  align?: CanvasTextAlign;
}) {
  input.context.save();
  input.context.translate(input.x, input.y);
  input.context.rotate((input.rotation * Math.PI) / 180);
  input.context.globalAlpha = clampOpacity(input.opacity);
  input.context.fillStyle = input.color;
  input.context.textAlign = input.align ?? "left";
  input.context.textBaseline = "alphabetic";
  input.context.font = input.font;
  input.context.fillText(input.text, 0, 0);
  input.context.restore();
}

function drawTextWatermark(page: PDFPage, font: PDFFont, config: WatermarkConfig) {
  const { width, height } = page.getSize();
  const text = config.text.trim() || "CONFIDENTIAL";
  const textWidth = font.widthOfTextAtSize(text, config.fontSize);
  const position = resolveWatermarkPosition({
    preset: config.positionPreset,
    pageWidth: width,
    pageHeight: height,
    elementWidth: textWidth,
    elementHeight: config.fontSize,
    customX: config.x,
    customY: config.y,
  });

  page.drawText(text, {
    x: position.x,
    y: position.y,
    size: config.fontSize,
    font,
    color: parseHexColor(config.color),
    opacity: clampOpacity(config.opacity),
    rotate: degrees(config.rotation),
  });
}

function drawPatternWatermark(page: PDFPage, font: PDFFont, config: WatermarkConfig) {
  const { width, height } = page.getSize();
  const text = config.text.trim() || "DRAFT";
  const spacingX = Math.max(80, config.patternSpacingX);
  const spacingY = Math.max(80, config.patternSpacingY);
  const textWidth = font.widthOfTextAtSize(text, config.fontSize);

  for (let row = -1; row <= Math.ceil(height / spacingY) + 1; row += 1) {
    const offsetX = config.patternStaggered && row % 2 !== 0 ? spacingX / 2 : 0;

    for (let x = -textWidth; x <= width + spacingX; x += spacingX) {
      page.drawText(text, {
        x: x + offsetX,
        y: row * spacingY,
        size: config.fontSize,
        font,
        color: parseHexColor(config.color),
        opacity: clampOpacity(config.opacity),
        rotate: degrees(config.rotation),
      });
    }
  }
}

function drawPolyline(
  page: PDFPage,
  points: Array<{ x: number; y: number }>,
  color: RGB,
  opacity: number,
  thickness = 0.65,
) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];

    if (
      Number.isFinite(start.x) &&
      Number.isFinite(start.y) &&
      Number.isFinite(end.x) &&
      Number.isFinite(end.y)
    ) {
      page.drawLine({
        start,
        end,
        thickness,
        color,
        opacity,
      });
    }
  }
}

function drawSafeLayer(page: PDFPage, font: PDFFont, config: WatermarkConfig) {
  const { width, height } = page.getSize();
  const text = config.text.trim() || "PROTECTED";
  const color = parseHexColor(config.color || "#7d3432");
  const opacity = clampOpacity(config.opacity);
  const pattern = createSafeLayerPattern({
    seed: config.safeLayerSeed || config.id,
    text,
    style: config.safeLayerStyle,
    distortion: config.safeLayerDistortion,
    width,
    height,
    opacity,
    rotation: config.rotation,
    textSpacing: config.safeLayerTextSpacing,
    lineSpacing: config.safeLayerLineSpacing,
    waveStrength: config.safeLayerWaveStrength,
    contourStrength: config.safeLayerContourStrength,
    holographicIntensity: config.safeLayerHolographicIntensity,
  });
  const holographicColors: Record<"red" | "blue" | "violet", RGB> = {
    red: rgb(0.86, 0.18, 0.2),
    blue: rgb(0.18, 0.58, 0.88),
    violet: rgb(0.56, 0.36, 0.92),
  };

  for (const line of pattern.waveLines) {
    drawPolyline(page, line.points, color, line.opacity, 0.58);
  }

  for (const line of pattern.contourLines) {
    drawPolyline(page, line.points, color, line.opacity, 0.45);
  }

  for (const line of pattern.holographicLines) {
    const tone = line.tone && line.tone !== "primary" ? line.tone : "blue";
    drawPolyline(page, line.points, holographicColors[tone], line.opacity, 0.72);
  }

  for (const mark of pattern.textMarks) {
    page.drawText(mark.text, {
      x: mark.x,
      y: mark.y,
      size: config.fontSize,
      font,
      color,
      opacity: mark.opacity,
      rotate: degrees(mark.rotation),
    });
  }
}

function drawSeal(page: PDFPage, font: PDFFont, boldFont: PDFFont, config: WatermarkConfig) {
  const { width, height } = page.getSize();
  const sealScale = Math.min(1.8, Math.max(0.55, config.scale || 1));
  const sealWidth = config.sealStyle === "circular" ? 150 * sealScale : 220 * sealScale;
  const sealHeight = config.sealStyle === "circular" ? 150 * sealScale : 92 * sealScale;
  const position = resolveWatermarkPosition({
    preset: config.positionPreset,
    pageWidth: width,
    pageHeight: height,
    elementWidth: sealWidth,
    elementHeight: sealHeight,
    customX: config.x,
    customY: config.y,
  });
  const color = parseHexColor(config.color);
  const opacity = clampOpacity(config.opacity);
  const dateText = new Date().toISOString().slice(0, 10);
  const title = (config.sealTitle || "REVIEWED").trim().toUpperCase();
  const subtitle = (config.sealSubtitle || "DOCUMENT CONTROL").trim().toUpperCase();
  const documentId = config.sealDocumentId.trim().toUpperCase();
  const borderWidth = Math.max(1, config.sealBorderThickness);
  const rotation = degrees(config.rotation);

  if (config.sealStyle === "circular") {
    page.drawEllipse({
      x: position.x + sealWidth / 2,
      y: position.y + sealHeight / 2,
      xScale: sealWidth / 2,
      yScale: sealHeight / 2,
      borderColor: color,
      borderWidth,
      opacity,
      rotate: rotation,
    });
    page.drawEllipse({
      x: position.x + sealWidth / 2,
      y: position.y + sealHeight / 2,
      xScale: sealWidth / 2 - 10 * sealScale,
      yScale: sealHeight / 2 - 10 * sealScale,
      borderColor: color,
      borderWidth: Math.max(1, borderWidth * 0.65),
      opacity: opacity * 0.7,
      rotate: rotation,
    });
  } else {
    page.drawRectangle({
      x: position.x,
      y: position.y,
      width: sealWidth,
      height: sealHeight,
      borderColor: color,
      borderWidth,
      opacity,
      rotate: rotation,
    });
    page.drawRectangle({
      x: position.x + 14 * sealScale,
      y: position.y + sealHeight - 34 * sealScale,
      width: sealWidth - 28 * sealScale,
      height: Math.max(1, borderWidth * 0.55),
      color,
      opacity: opacity * 0.75,
      rotate: rotation,
    });
  }

  const centerX = position.x + sealWidth / 2;
  const titleSize = (config.sealStyle === "circular" ? 19 : 22) * sealScale;
  const subtitleSize = 9.5 * sealScale;
  const metaSize = 8.5 * sealScale;
  const drawCenteredText = (text: string, y: number, size: number, textFont: PDFFont) => {
    const textWidth = textFont.widthOfTextAtSize(text, size);
    const x = centerX - textWidth / 2;

    page.drawText(text, {
      x,
      y,
      size,
      font: textFont,
      color,
      opacity,
      rotate: rotation,
    });
  };

  drawCenteredText(title, position.y + sealHeight / 2 + 8 * sealScale, titleSize, boldFont);
  drawCenteredText(subtitle, position.y + sealHeight / 2 - 12 * sealScale, subtitleSize, font);

  if (documentId) {
    drawCenteredText(documentId, position.y + 16 * sealScale, metaSize, font);
  }

  if (config.sealShowDate) {
    drawCenteredText(dateText, position.y + (documentId ? 30 : 16) * sealScale, metaSize, font);
  }
}

async function drawImageWatermark(page: PDFPage, image: PDFImage, config: WatermarkConfig) {
  const { width, height } = page.getSize();
  const scale = Math.min(2, Math.max(0.05, config.scale));
  const dimensions = image.scale(scale);
  const position = resolveWatermarkPosition({
    preset: config.positionPreset,
    pageWidth: width,
    pageHeight: height,
    elementWidth: dimensions.width,
    elementHeight: dimensions.height,
    customX: config.x,
    customY: config.y,
  });

  page.drawImage(image, {
    x: position.x,
    y: position.y,
    width: dimensions.width,
    height: dimensions.height,
    opacity: clampOpacity(config.opacity),
    rotate: degrees(config.rotation),
  });
}

async function drawLayer(
  page: PDFPage,
  regularFont: PDFFont,
  boldFont: PDFFont,
  layer: DocumentLayer,
  embeddedImage: PDFImage | null,
) {
  switch (layer.type) {
    case "text":
      drawTextWatermark(page, boldFont, layer);
      break;
    case "pattern":
      drawPatternWatermark(page, boldFont, layer);
      break;
    case "safelayer":
      drawSafeLayer(page, boldFont, layer);
      break;
    case "seal":
      drawSeal(page, regularFont, boldFont, layer);
      break;
    case "image":
      if (embeddedImage) {
        await drawImageWatermark(page, embeddedImage, layer);
      }
      break;
    case "blackout":
      break;
    default:
      break;
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function samplePixel(data: Uint8ClampedArray, x: number, y: number, width: number, height: number) {
  const px = Math.max(0, Math.min(width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(height - 1, Math.round(y)));
  const index = (py * width + px) * 4;
  return [data[index] ?? 255, data[index + 1] ?? 255, data[index + 2] ?? 255] as const;
}

function invertedPixelColor(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha: number,
) {
  const [red, green, blue] = samplePixel(data, x, y, width, height);
  return `rgba(${255 - red},${255 - green},${255 - blue},${alpha})`;
}

function drawCanvasLine(
  context: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  canvasHeight: number,
  imageData: ImageData,
  fallbackColor: string,
  opacity: number,
  thickness: number,
  invertFromPixels = false,
) {
  if (points.length < 2) {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = thickness;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const startY = canvasHeight - start.y;
    const endY = canvasHeight - end.y;

    if (!Number.isFinite(start.x) || !Number.isFinite(startY) || !Number.isFinite(end.x) || !Number.isFinite(endY)) {
      continue;
    }

    if (invertFromPixels) {
      const gradient = context.createLinearGradient(start.x, startY, end.x, endY);
      gradient.addColorStop(
        0,
        invertedPixelColor(imageData.data, start.x, startY, imageData.width, imageData.height, opacity),
      );
      gradient.addColorStop(
        1,
        invertedPixelColor(imageData.data, end.x, endY, imageData.width, imageData.height, opacity),
      );
      context.strokeStyle = gradient;
      context.globalAlpha = 1;
    } else {
      context.strokeStyle = fallbackColor;
      context.globalAlpha = opacity;
    }

    context.beginPath();
    context.moveTo(start.x, startY);
    context.lineTo(end.x, endY);
    context.stroke();
  }

  context.restore();
}

function drawCanvasSafeLayer(
  context: CanvasRenderingContext2D,
  layer: DocumentLayer,
  canvas: HTMLCanvasElement,
  imageData: ImageData,
) {
  const text = (layer.text.trim() || "PROTECTED").toUpperCase();
  const opacity = clampOpacity(layer.opacity);
  const pattern = createSafeLayerPattern({
    seed: `${layer.safeLayerSeed || layer.id}|page-canvas`,
    text,
    style: layer.safeLayerStyle,
    distortion: layer.safeLayerDistortion,
    width: canvas.width,
    height: canvas.height,
    opacity,
    rotation: layer.rotation,
    textSpacing: layer.safeLayerTextSpacing * (canvas.width / 612),
    lineSpacing: layer.safeLayerLineSpacing * (canvas.height / 792),
    waveStrength: layer.safeLayerWaveStrength * (canvas.height / 792),
    contourStrength: layer.safeLayerContourStrength * (canvas.height / 792),
    holographicIntensity: layer.safeLayerHolographicIntensity,
  });
  const color = hexToCss(layer.color);
  const fontSize = Math.max(7, layer.fontSize * (canvas.width / 612));

  for (const line of pattern.waveLines) {
    drawCanvasLine(context, line.points, canvas.height, imageData, color, line.opacity, 0.8, true);
  }

  for (const line of pattern.contourLines) {
    drawCanvasLine(context, line.points, canvas.height, imageData, color, line.opacity, 0.62, true);
  }

  for (const line of pattern.holographicLines) {
    drawCanvasLine(context, line.points, canvas.height, imageData, color, line.opacity, 1.05, false);
  }

  for (const mark of pattern.textMarks) {
    drawCanvasRotatedText({
      context,
      text: mark.text,
      x: mark.x,
      y: canvas.height - mark.y,
      font: `700 ${fontSize}px Arial, sans-serif`,
      color,
      opacity: mark.opacity,
      rotation: mark.rotation,
      align: "center",
    });
  }
}

async function loadCanvasImage(layer: DocumentLayer): Promise<CanvasImageSource | null> {
  if (!layer.imageData || !layer.imageMimeType) {
    return null;
  }

  const imageBytes = new Uint8Array(layer.imageData);
  const blob = new Blob([imageBytes.buffer], { type: layer.imageMimeType });

  if ("createImageBitmap" in window) {
    return createImageBitmap(blob);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image watermark could not be loaded."));
    };
    image.src = url;
  });
}

async function embedImagesForLayers(pdfDoc: PDFDocument, layers: DocumentLayer[]): Promise<Map<string, PDFImage>> {
  const embeddedImages = new Map<string, PDFImage>();

  for (const layer of layers) {
    if (!layer.enabled || layer.type !== "image" || !layer.imageData || !layer.imageMimeType) {
      continue;
    }

    embeddedImages.set(
      layer.id,
      layer.imageMimeType === "image/png"
        ? await pdfDoc.embedPng(layer.imageData)
        : await pdfDoc.embedJpg(layer.imageData),
    );
  }

  return embeddedImages;
}

async function createCanvasImagesForLayers(layers: DocumentLayer[]): Promise<Map<string, CanvasImageSource>> {
  const images = new Map<string, CanvasImageSource>();

  for (const layer of layers) {
    if (!layer.enabled || layer.type !== "image") {
      continue;
    }

    const image = await loadCanvasImage(layer);

    if (image) {
      images.set(layer.id, image);
    }
  }

  return images;
}

function drawCanvasTextWatermark(
  context: CanvasRenderingContext2D,
  layer: DocumentLayer,
  pageWidth: number,
  pageHeight: number,
  scaleX: number,
  scaleY: number,
) {
  const text = layer.text.trim() || "CONFIDENTIAL";
  const fontSize = layer.fontSize * scaleY;
  context.save();
  context.font = `700 ${fontSize}px Arial, sans-serif`;
  const textWidth = context.measureText(text).width / scaleX;
  const position = resolveWatermarkPosition({
    preset: layer.positionPreset,
    pageWidth,
    pageHeight,
    elementWidth: textWidth,
    elementHeight: layer.fontSize,
    customX: layer.x,
    customY: layer.y,
  });
  context.restore();

  drawCanvasRotatedText({
    context,
    text,
    x: position.x * scaleX,
    y: pdfYToCanvas(position.y, 0, pageHeight * scaleY, scaleY),
    font: `700 ${fontSize}px Arial, sans-serif`,
    color: hexToCss(layer.color),
    opacity: layer.opacity,
    rotation: layer.rotation,
  });
}

function drawCanvasPatternWatermark(
  context: CanvasRenderingContext2D,
  layer: DocumentLayer,
  pageWidth: number,
  pageHeight: number,
  scaleX: number,
  scaleY: number,
) {
  const text = layer.text.trim() || "DRAFT";
  const fontSize = layer.fontSize * scaleY;
  const spacingX = Math.max(80, layer.patternSpacingX);
  const spacingY = Math.max(80, layer.patternSpacingY);
  context.save();
  context.font = `700 ${fontSize}px Arial, sans-serif`;
  const textWidth = context.measureText(text).width / scaleX;
  context.restore();

  for (let row = -1; row <= Math.ceil(pageHeight / spacingY) + 1; row += 1) {
    const offsetX = layer.patternStaggered && row % 2 !== 0 ? spacingX / 2 : 0;

    for (let x = -textWidth; x <= pageWidth + spacingX; x += spacingX) {
      drawCanvasRotatedText({
        context,
        text,
        x: (x + offsetX) * scaleX,
        y: pageHeight * scaleY - row * spacingY * scaleY,
        font: `700 ${fontSize}px Arial, sans-serif`,
        color: hexToCss(layer.color),
        opacity: layer.opacity,
        rotation: layer.rotation,
      });
    }
  }
}

function drawCanvasSeal(
  context: CanvasRenderingContext2D,
  layer: DocumentLayer,
  pageWidth: number,
  pageHeight: number,
  scaleX: number,
  scaleY: number,
) {
  const sealScale = Math.min(1.8, Math.max(0.55, layer.scale || 1));
  const sealWidth = (layer.sealStyle === "circular" ? 150 : 220) * sealScale;
  const sealHeight = (layer.sealStyle === "circular" ? 150 : 92) * sealScale;
  const position = resolveWatermarkPosition({
    preset: layer.positionPreset,
    pageWidth,
    pageHeight,
    elementWidth: sealWidth,
    elementHeight: sealHeight,
    customX: layer.x,
    customY: layer.y,
  });
  const x = position.x * scaleX;
  const y = pdfYToCanvas(position.y, sealHeight, pageHeight * scaleY, scaleY);
  const width = sealWidth * scaleX;
  const height = sealHeight * scaleY;
  const title = (layer.sealTitle || "REVIEWED").trim().toUpperCase();
  const subtitle = (layer.sealSubtitle || "DOCUMENT CONTROL").trim().toUpperCase();
  const documentId = layer.sealDocumentId.trim().toUpperCase();

  context.save();
  context.translate(x + width / 2, y + height / 2);
  context.rotate((layer.rotation * Math.PI) / 180);
  setCanvasAlphaColor(context, layer.color, layer.opacity);
  context.lineWidth = Math.max(1, layer.sealBorderThickness * scaleX);

  if (layer.sealStyle === "circular") {
    context.beginPath();
    context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = clampOpacity(layer.opacity * 0.7);
    context.beginPath();
    context.ellipse(0, 0, Math.max(1, width / 2 - 10 * scaleX), Math.max(1, height / 2 - 10 * scaleY), 0, 0, Math.PI * 2);
    context.stroke();
  } else {
    context.strokeRect(-width / 2, -height / 2, width, height);
    context.globalAlpha = clampOpacity(layer.opacity * 0.75);
    context.fillRect(-width / 2 + 14 * scaleX, -height / 2 + 28 * scaleY, width - 28 * scaleX, Math.max(1, layer.sealBorderThickness * 0.55 * scaleY));
  }

  context.globalAlpha = clampOpacity(layer.opacity);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = hexToCss(layer.color);
  context.font = `700 ${Math.max(10, 22 * sealScale * scaleY)}px Arial, sans-serif`;
  context.fillText(title, 0, -2 * scaleY);
  context.font = `500 ${Math.max(8, 9.5 * sealScale * scaleY)}px Arial, sans-serif`;
  context.fillText(subtitle, 0, 16 * scaleY);

  if (documentId) {
    context.fillText(documentId, 0, height / 2 - 17 * scaleY);
  }

  if (layer.sealShowDate) {
    context.fillText(new Date().toISOString().slice(0, 10), 0, height / 2 - (documentId ? 31 : 17) * scaleY);
  }

  context.restore();
}

function drawCanvasImageWatermark(
  context: CanvasRenderingContext2D,
  layer: DocumentLayer,
  image: CanvasImageSource,
  pageWidth: number,
  pageHeight: number,
  scaleX: number,
  scaleY: number,
) {
  const sourceWidth = "width" in image ? Number(image.width) : 260;
  const sourceHeight = "height" in image ? Number(image.height) : sourceWidth;
  const width = Math.max(48, sourceWidth * Math.min(2, Math.max(0.05, layer.scale)));
  const height = Math.max(48, sourceHeight * Math.min(2, Math.max(0.05, layer.scale)));
  const position = resolveWatermarkPosition({
    preset: layer.positionPreset,
    pageWidth,
    pageHeight,
    elementWidth: width,
    elementHeight: height,
    customX: layer.x,
    customY: layer.y,
  });

  context.save();
  context.globalAlpha = clampOpacity(layer.opacity);
  context.translate(position.x * scaleX + (width * scaleX) / 2, pdfYToCanvas(position.y, height, pageHeight * scaleY, scaleY) + (height * scaleY) / 2);
  context.rotate((layer.rotation * Math.PI) / 180);
  context.drawImage(image, (-width * scaleX) / 2, (-height * scaleY) / 2, width * scaleX, height * scaleY);
  context.restore();
}

function drawCanvasBlackouts(
  context: CanvasRenderingContext2D,
  layer: DocumentLayer,
  pageNumber: number,
  scaleX: number,
  scaleY: number,
  canvasHeight: number,
) {
  if (layer.type !== "blackout" || !layer.blackoutRects.length) {
    return;
  }

  context.save();
  context.fillStyle = "#000000";
  context.globalAlpha = 1;

  for (const rect of layer.blackoutRects) {
    if (rect.page !== pageNumber) {
      continue;
    }

    context.fillRect(
      rect.x * scaleX,
      canvasHeight - (rect.y + rect.height) * scaleY,
      rect.width * scaleX,
      rect.height * scaleY,
    );
  }

  context.restore();
}

function drawCanvasLayer(input: {
  context: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  imageData: ImageData;
  layer: DocumentLayer;
  canvasImage: CanvasImageSource | null;
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  scaleX: number;
  scaleY: number;
}) {
  const { context, canvas, imageData, layer, canvasImage, pageNumber, pageWidth, pageHeight, scaleX, scaleY } = input;

  switch (layer.type) {
    case "blackout":
      drawCanvasBlackouts(context, layer, pageNumber, scaleX, scaleY, canvas.height);
      break;
    case "text":
      drawCanvasTextWatermark(context, layer, pageWidth, pageHeight, scaleX, scaleY);
      break;
    case "pattern":
      drawCanvasPatternWatermark(context, layer, pageWidth, pageHeight, scaleX, scaleY);
      break;
    case "safelayer":
      drawCanvasSafeLayer(context, layer, canvas, imageData);
      break;
    case "seal":
      drawCanvasSeal(context, layer, pageWidth, pageHeight, scaleX, scaleY);
      break;
    case "image":
      if (canvasImage) {
        drawCanvasImageWatermark(context, layer, canvasImage, pageWidth, pageHeight, scaleX, scaleY);
      }
      break;
    default:
      break;
  }
}

async function yieldToBrowser() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function applyRenderableLayers(
  pdfDoc: PDFDocument,
  layers: DocumentLayer[],
  pages: PDFPage[],
): Promise<void> {
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const embeddedImages = await embedImagesForLayers(pdfDoc, layers);

  for (const layer of layers) {
    if (!layer.enabled || layer.type === "blackout") {
      continue;
    }

    const selectedPages = resolvePageRules(layer.pages, pages.length);

    for (const pageIndex of selectedPages) {
      await drawLayer(pages[pageIndex], regularFont, boldFont, layer, embeddedImages.get(layer.id) ?? null);
    }
  }
}

async function createFlattenedPdf(
  inputBytes: Uint8Array,
  layers: DocumentLayer[],
  options: ApplyWatermarkOptions,
): Promise<Uint8Array> {
  const sourceDoc = await PDFDocument.load(inputBytes.slice(), { updateMetadata: false });
  const outputDoc = await PDFDocument.create();
  const sourcePages = sourceDoc.getPages();
  const canvasImages = await createCanvasImagesForLayers(layers);
  const selectedPagesByLayer = new Map<string, number[]>();

  for (const layer of layers) {
    if (!layer.enabled) {
      continue;
    }

    selectedPagesByLayer.set(layer.id, resolvePageRules(layer.pages, sourcePages.length));
  }

  try {
    for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
      const sourcePage = sourcePages[pageIndex];
      const { width, height } = sourcePage.getSize();
      const pageNumber = pageIndex + 1;

      const canvas = document.createElement("canvas");
      await renderPdfPageToCanvas(inputBytes, canvas, pageNumber, FLATTENED_EXPORT_SCALE, {
        maxCanvasPixels: MAX_EXPORT_CANVAS_PIXELS,
      });
      const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });

      if (!context) {
        throw new Error("Canvas rendering context is not available.");
      }

      const scaleX = canvas.width / width;
      const scaleY = canvas.height / height;
      const pagePixels = context.getImageData(0, 0, canvas.width, canvas.height);

      for (const layer of layers.filter((candidate) => candidate.type === "blackout")) {
        if (!layer.enabled) {
          continue;
        }

        const selectedPages = selectedPagesByLayer.get(layer.id) ?? [];

        if (!selectedPages.includes(pageIndex)) {
          continue;
        }

        drawCanvasLayer({
          context,
          canvas,
          imageData: pagePixels,
          layer,
          canvasImage: canvasImages.get(layer.id) ?? null,
          pageNumber,
          pageWidth: width,
          pageHeight: height,
          scaleX,
          scaleY,
        });
      }

      for (const layer of layers.filter((candidate) => candidate.type !== "blackout")) {
        if (!layer.enabled) {
          continue;
        }

        const selectedPages = selectedPagesByLayer.get(layer.id) ?? [];

        if (!selectedPages.includes(pageIndex)) {
          continue;
        }

        drawCanvasLayer({
          context,
          canvas,
          imageData: pagePixels,
          layer,
          canvasImage: canvasImages.get(layer.id) ?? null,
          pageNumber,
          pageWidth: width,
          pageHeight: height,
          scaleX,
          scaleY,
        });
      }

      const imageBytes = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.93));
      const embeddedPage = await outputDoc.embedJpg(imageBytes);
      const page = outputDoc.addPage([width, height]);
      page.drawImage(embeddedPage, { x: 0, y: 0, width, height });
      options.onProgress?.({ current: pageNumber, total: sourcePages.length });

      if (pageIndex % 3 === 2) {
        await yieldToBrowser();
      }
    }
  } finally {
    for (const image of canvasImages.values()) {
      if ("close" in image && typeof image.close === "function") {
        image.close();
      }
    }
  }

  if (options.cleanupMetadata) {
    sanitizePdfMetadata(outputDoc);
  }

  return outputDoc.save();
}

export async function applyDocumentLayers(
  inputBytes: Uint8Array,
  layers: DocumentLayer[],
  options: ApplyWatermarkOptions = {},
): Promise<Uint8Array> {
  return createFlattenedPdf(inputBytes, layers, options);
}

export async function applyWatermark(
  inputBytes: Uint8Array,
  config: WatermarkConfig,
  options: ApplyWatermarkOptions = {},
): Promise<Uint8Array> {
  return applyDocumentLayers(inputBytes, [config], options);
}
