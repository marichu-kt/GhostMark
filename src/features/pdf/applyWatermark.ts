import { PDFDocument } from "pdf-lib";
import type { DocumentLayer, WatermarkConfig } from "../../types/watermark";
import { resolveWatermarkPosition } from "../watermark/positioning";
import { createSafeLayerRenderModel } from "../watermark/safelayerRenderer";
import {
  buildFlattenedExportPlan,
  FLATTENED_EXPORT_SCALE,
  MAX_EXPORT_CANVAS_PIXELS,
} from "./flattenedExportPlan";
import { sanitizePdfMetadata } from "./metadataSanitizer";
import { renderPdfPageToCanvas } from "./renderPdfPreview";

interface ApplyWatermarkOptions {
  cleanupMetadata?: boolean;
  onProgress?: (progress: { current: number; total: number }) => void;
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

function drawCanvasSegment(
  context: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  imageData: ImageData,
  fallbackColor: string,
  opacity: number,
  thickness: number,
  invertFromPixels = false,
) {
  if (!Number.isFinite(start.x) || !Number.isFinite(start.y) || !Number.isFinite(end.x) || !Number.isFinite(end.y)) {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = thickness;

  if (invertFromPixels) {
    const gradient = context.createLinearGradient(start.x, start.y, end.x, end.y);
    gradient.addColorStop(
      0,
      invertedPixelColor(imageData.data, start.x, start.y, imageData.width, imageData.height, opacity),
    );
    gradient.addColorStop(
      1,
      invertedPixelColor(imageData.data, end.x, end.y, imageData.width, imageData.height, opacity),
    );
    context.strokeStyle = gradient;
    context.globalAlpha = 1;
  } else {
    context.strokeStyle = fallbackColor;
    context.globalAlpha = opacity;
  }

  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.restore();
}

function drawCanvasSafeLayerTextRows(
  context: CanvasRenderingContext2D,
  model: ReturnType<typeof createSafeLayerRenderModel>,
  color: string,
  canvas: HTMLCanvasElement,
) {
  const phrase = `${model.text} ◆ `;
  const hugeWidth = canvas.width * 3.8;
  const pivotX = canvas.width * 1.4;
  const pivotY = canvas.height * 1.4;

  context.save();
  context.translate(-canvas.width * 0.9, -canvas.height * 0.9);
  context.translate(pivotX, pivotY);
  context.rotate((model.rotation * Math.PI) / 180);
  context.translate(-pivotX, -pivotY);
  context.font = `700 ${model.fontSize}px Arial, sans-serif`;
  context.fillStyle = color;
  context.textBaseline = "middle";

  const phraseWidth = Math.max(32, context.measureText(phrase).width);

  for (const row of model.textRows) {
    context.globalAlpha = row.opacity * model.textOpacity;
    const startX = -row.offsetRatio * hugeWidth;

    for (let x = startX; x < hugeWidth; x += phraseWidth) {
      const y = row.y + Math.sin(x / 33 + row.offsetRatio * 16) * row.amplitude;
      context.fillText(phrase, x, y);
    }
  }

  context.restore();
}

async function drawCanvasSafeLayer(
  context: CanvasRenderingContext2D,
  layer: DocumentLayer,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  imageData: ImageData,
) {
  const text = (layer.text.trim() || "PROTECTED").toUpperCase();
  const model = createSafeLayerRenderModel({
    seed: `${layer.safeLayerSeed || ""}|${layer.id}|canvas`,
    text,
    pageNumber,
    width: canvas.width,
    height: canvas.height,
    quality: "export",
  });
  const color = hexToCss(layer.color);
  const toneColor = {
    primary: color,
    red: "#d95a58",
    blue: "#47a5d8",
    violet: "#8f74d9",
  };

  for (const segment of model.contourSegments) {
    drawCanvasSegment(context, segment.start, segment.end, imageData, toneColor[segment.tone], segment.opacity, 0.9, true);
  }

  drawCanvasSafeLayerTextRows(context, model, color, canvas);
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

async function drawCanvasLayer(input: {
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
      await drawCanvasSafeLayer(context, layer, pageNumber, canvas, imageData);
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

async function createFlattenedPdf(
  inputBytes: Uint8Array,
  layers: DocumentLayer[],
  options: ApplyWatermarkOptions,
): Promise<Uint8Array> {
  const sourceDoc = await PDFDocument.load(inputBytes.slice(), { updateMetadata: false });
  const outputDoc = await PDFDocument.create();
  const sourcePages = sourceDoc.getPages();
  const canvasImages = await createCanvasImagesForLayers(layers);
  const pagePlans = buildFlattenedExportPlan(layers, sourcePages.length);
  const layersById = new Map(layers.map((layer) => [layer.id, layer]));

  try {
    for (const pagePlan of pagePlans) {
      const pageIndex = pagePlan.pageIndex;
      const sourcePage = sourcePages[pageIndex];
      const { width, height } = sourcePage.getSize();
      const pageNumber = pagePlan.pageNumber;

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

      for (const layerId of pagePlan.layerIds) {
        const layer = layersById.get(layerId);

        if (!layer || layer.type !== "blackout") {
          continue;
        }

        await drawCanvasLayer({
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

      for (const layerId of pagePlan.layerIds) {
        const layer = layersById.get(layerId);

        if (!layer || layer.type === "blackout") {
          continue;
        }

        await drawCanvasLayer({
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

  sanitizePdfMetadata(outputDoc);

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
