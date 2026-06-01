import { PDFDocument } from "pdf-lib";
import type { DocumentLayer, WatermarkConfig } from "../../types/watermark";
import {
  createImageRenderPlan,
  createSealRenderPlan,
  getPatternTextSize,
  getTextLayerSize,
  resolveLayerPlacement,
} from "../watermark/layerGeometry";
import { drawSafeLayerToCanvas } from "../watermark/safelayerCanvasRenderer";
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
  left: number;
  top: number;
  width: number;
  height: number;
  font: string;
  color: string;
  opacity: number;
  rotation: number;
  align?: CanvasTextAlign;
}) {
  input.context.save();
  input.context.translate(input.left + input.width / 2, input.top + input.height / 2);
  input.context.rotate((input.rotation * Math.PI) / 180);
  input.context.globalAlpha = clampOpacity(input.opacity);
  input.context.fillStyle = input.color;
  input.context.textAlign = input.align ?? "left";
  input.context.textBaseline = "top";
  input.context.font = input.font;
  input.context.fillText(input.text, -input.width / 2, -input.height / 2);
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

function getCanvasImageDimensions(image: CanvasImageSource): { width: number; height: number } {
  const maybeBitmap = image as CanvasImageSource & { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number };

  return {
    width: Math.max(1, Number(maybeBitmap.naturalWidth ?? maybeBitmap.width ?? 260)),
    height: Math.max(1, Number(maybeBitmap.naturalHeight ?? maybeBitmap.height ?? 260)),
  };
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
  const size = getTextLayerSize(layer);
  const position = resolveLayerPlacement({
    layer,
    pageWidth,
    pageHeight,
    elementWidth: size.width,
    elementHeight: size.height,
  });
  const fontSize = layer.fontSize * scaleY;

  drawCanvasRotatedText({
    context,
    text,
    left: position.x * scaleX,
    top: position.top * scaleY,
    width: position.width * scaleX,
    height: position.height * scaleY,
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
  const size = getPatternTextSize(layer);
  const fontSize = layer.fontSize * scaleY;
  const spacingX = Math.max(80, layer.patternSpacingX);
  const spacingY = Math.max(80, layer.patternSpacingY);

  for (let row = -1; row <= Math.ceil(pageHeight / spacingY) + 1; row += 1) {
    const offsetX = layer.patternStaggered && row % 2 !== 0 ? spacingX / 2 : 0;

    for (let x = -size.width; x <= pageWidth + spacingX; x += spacingX) {
      const y = row * spacingY - spacingY;
      drawCanvasRotatedText({
        context,
        text,
        left: (x + offsetX) * scaleX,
        top: y * scaleY,
        width: size.width * scaleX,
        height: size.height * scaleY,
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
  const plan = createSealRenderPlan({
    layer,
    pageWidth,
    pageHeight,
  });
  const x = plan.x * scaleX;
  const y = plan.top * scaleY;
  const width = plan.width * scaleX;
  const height = plan.height * scaleY;
  const scaled = (value: number) => value * scaleY;

  context.save();
  context.translate(x + width / 2, y + height / 2);
  context.rotate((plan.rotation * Math.PI) / 180);
  setCanvasAlphaColor(context, plan.color, plan.opacity);
  context.lineWidth = Math.max(1, plan.borderWidth * scaleX);

  if (plan.circular) {
    context.beginPath();
    context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = clampOpacity(plan.opacity * 0.7);
    context.beginPath();
    context.ellipse(0, 0, Math.max(1, width / 2 - 10 * scaleX), Math.max(1, height / 2 - 10 * scaleY), 0, 0, Math.PI * 2);
    context.stroke();
  } else {
    context.strokeRect(-width / 2, -height / 2, width, height);
    context.globalAlpha = clampOpacity(plan.opacity * 0.75);
    context.fillRect(
      -width / 2 + plan.dividerInset * scaleX,
      -height / 2 + plan.dividerTop * scaleY,
      width - plan.dividerInset * 2 * scaleX,
      Math.max(1, plan.borderWidth * 0.55 * scaleY),
    );
    context.fillRect(
      -width / 2 + plan.dividerInset * scaleX,
      -height / 2 + plan.dividerBottom * scaleY,
      width - plan.dividerInset * 2 * scaleX,
      Math.max(1, plan.borderWidth * 0.55 * scaleY),
    );
  }

  context.globalAlpha = clampOpacity(plan.opacity);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = hexToCss(plan.color);
  context.font = `700 ${scaled(plan.titleFontSize)}px Arial, sans-serif`;
  context.fillText(plan.title, 0, -height / 2 + plan.titleY * scaleY);
  context.font = `500 ${scaled(plan.subtitleFontSize)}px Arial, sans-serif`;
  context.fillText(plan.subtitle, 0, -height / 2 + plan.subtitleY * scaleY);

  if (plan.documentId) {
    context.font = `500 ${scaled(plan.metaFontSize)}px Arial, sans-serif`;
    context.fillText(plan.documentId, 0, -height / 2 + plan.documentIdY * scaleY);
  }

  if (plan.dateText) {
    context.font = `500 ${scaled(plan.metaFontSize)}px Arial, sans-serif`;
    context.fillText(plan.dateText, 0, -height / 2 + plan.dateY * scaleY);
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
  const dimensions = getCanvasImageDimensions(image);
  const plan = createImageRenderPlan({
    layer,
    pageWidth,
    pageHeight,
    sourceWidth: dimensions.width,
    sourceHeight: dimensions.height,
  });

  context.save();
  context.globalAlpha = clampOpacity(layer.opacity);
  context.translate(plan.centerX * scaleX, plan.centerY * scaleY);
  context.rotate((plan.rotation * Math.PI) / 180);
  context.drawImage(image, (-plan.width * scaleX) / 2, (-plan.height * scaleY) / 2, plan.width * scaleX, plan.height * scaleY);
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
      await drawSafeLayerToCanvas({ context, layer, pageNumber, canvas, imageData, quality: "export" });
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
