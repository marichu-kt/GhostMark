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
import type { DocumentLayer, RedactionRectangle, WatermarkConfig } from "../../types/watermark";
import { resolveWatermarkPosition } from "../watermark/positioning";
import { resolvePageRules } from "./pageRules";
import { renderPdfPageToCanvas } from "./renderPdfPreview";

interface ApplyWatermarkOptions {
  cleanupMetadata?: boolean;
}

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

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
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

function drawClassificationBanner(page: PDFPage, font: PDFFont, config: WatermarkConfig) {
  const { width, height } = page.getSize();
  const text = (config.classificationText || config.text || "CONFIDENTIAL").trim().toUpperCase();
  const margin = Math.max(0, config.bannerMargin);
  const bannerHeight = Math.max(24, config.fontSize + 14);
  const textWidth = font.widthOfTextAtSize(text, config.fontSize);
  const color = rgb(0.49, 0.2, 0.2);
  const drawBanner = (y: number) => {
    page.drawRectangle({
      x: margin,
      y,
      width: width - margin * 2,
      height: bannerHeight,
      borderColor: color,
      borderWidth: 1,
      color,
      opacity: clampOpacity(config.opacity) * 0.12,
    });
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: y + bannerHeight / 2 - config.fontSize / 3,
      size: config.fontSize,
      font,
      color,
      opacity: clampOpacity(config.opacity),
    });
  };

  if (config.bannerEnabledTop) {
    drawBanner(height - margin - bannerHeight);
  }

  if (config.bannerEnabledBottom) {
    drawBanner(margin);
  }
}

function drawSeal(page: PDFPage, font: PDFFont, boldFont: PDFFont, config: WatermarkConfig) {
  const { width, height } = page.getSize();
  const sealWidth = 190;
  const sealHeight = config.sealShowDate ? 82 : 66;
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
  const subtitle = (config.sealSubtitle || "DOCUMENT CONTROL").trim();

  page.drawRectangle({
    x: position.x,
    y: position.y,
    width: sealWidth,
    height: sealHeight,
    borderColor: color,
    borderWidth: Math.max(1, config.sealBorderThickness),
    opacity,
    rotate: degrees(config.rotation),
  });

  page.drawText(title, {
    x: position.x + 18,
    y: position.y + sealHeight - 28,
    size: 18,
    font: boldFont,
    color,
    opacity,
    rotate: degrees(config.rotation),
  });

  page.drawText(subtitle, {
    x: position.x + 18,
    y: position.y + sealHeight - 48,
    size: 10,
    font,
    color,
    opacity,
    rotate: degrees(config.rotation),
  });

  if (config.sealShowDate) {
    page.drawText(dateText, {
      x: position.x + 18,
      y: position.y + 16,
      size: 10,
      font,
      color,
      opacity,
      rotate: degrees(config.rotation),
    });
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

function getRedactionRectanglesForPage(
  layers: DocumentLayer[],
  pageIndex: number,
  totalPages: number,
): RedactionRectangle[] {
  const pageNumber = pageIndex + 1;
  const rectangles: RedactionRectangle[] = [];

  for (const layer of layers) {
    if (!layer.enabled || layer.type !== "redaction") {
      continue;
    }

    const selectedPages = new Set(resolvePageRules(layer.pages, totalPages));

    if (!selectedPages.has(pageIndex)) {
      continue;
    }

    rectangles.push(
      ...layer.redactionRectangles.filter((rectangle) => rectangle.page === pageNumber),
    );
  }

  return rectangles;
}

async function flattenRedactedPages(inputBytes: Uint8Array, layers: DocumentLayer[]): Promise<Uint8Array> {
  const sourceDoc = await PDFDocument.load(inputBytes.slice(), { updateMetadata: false });
  const outputDoc = await PDFDocument.create();
  const sourcePages = sourceDoc.getPages();
  const totalPages = sourcePages.length;
  const redactionMap = new Map<number, RedactionRectangle[]>();

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const rectangles = getRedactionRectanglesForPage(layers, pageIndex, totalPages);

    if (rectangles.length > 0) {
      redactionMap.set(pageIndex, rectangles);
    }
  }

  if (redactionMap.size === 0) {
    return inputBytes;
  }

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const sourcePage = sourcePages[pageIndex];
    const { width, height } = sourcePage.getSize();
    const rectangles = redactionMap.get(pageIndex);

    if (!rectangles) {
      const [copiedPage] = await outputDoc.copyPages(sourceDoc, [pageIndex]);
      outputDoc.addPage(copiedPage);
      continue;
    }

    const canvas = document.createElement("canvas");
    await renderPdfPageToCanvas(inputBytes, canvas, pageIndex + 1, 2);
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("Canvas rendering context is not available.");
    }

    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;
    context.fillStyle = "#000000";

    for (const rectangle of rectangles) {
      context.fillRect(
        rectangle.x * scaleX,
        (height - rectangle.y - rectangle.height) * scaleY,
        rectangle.width * scaleX,
        rectangle.height * scaleY,
      );
    }

    const pngBytes = dataUrlToBytes(canvas.toDataURL("image/png"));
    const image = await outputDoc.embedPng(pngBytes);
    const redactedPage = outputDoc.addPage([width, height]);

    redactedPage.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  return outputDoc.save();
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
    case "classification-banner":
      drawClassificationBanner(page, boldFont, layer);
      break;
    case "seal":
      drawSeal(page, regularFont, boldFont, layer);
      break;
    case "image":
      if (embeddedImage) {
        await drawImageWatermark(page, embeddedImage, layer);
      }
      break;
    default:
      break;
  }
}

export async function applyDocumentLayers(
  inputBytes: Uint8Array,
  layers: DocumentLayer[],
  options: ApplyWatermarkOptions = {},
): Promise<Uint8Array> {
  const redactedBytes = await flattenRedactedPages(inputBytes, layers);
  const pdfDoc = await PDFDocument.load(redactedBytes.slice(), { updateMetadata: false });
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const embeddedImages = new Map<string, PDFImage>();

  for (const layer of layers) {
    if (!layer.enabled || layer.type === "redaction") {
      continue;
    }

    let embeddedImage: PDFImage | null = null;
    if (layer.type === "image" && layer.imageData && layer.imageMimeType) {
      embeddedImage =
        layer.imageMimeType === "image/png"
          ? await pdfDoc.embedPng(layer.imageData)
          : await pdfDoc.embedJpg(layer.imageData);
      embeddedImages.set(layer.id, embeddedImage);
    }

    const selectedPages = resolvePageRules(layer.pages, pages.length);

    for (const pageIndex of selectedPages) {
      await drawLayer(pages[pageIndex], regularFont, boldFont, layer, embeddedImages.get(layer.id) ?? null);
    }
  }

  if (options.cleanupMetadata) {
    pdfDoc.setTitle("");
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer("GhostMark");
    pdfDoc.setCreator("GhostMark");
    pdfDoc.setModificationDate(new Date());
  }

  return pdfDoc.save();
}

export async function applyWatermark(
  inputBytes: Uint8Array,
  config: WatermarkConfig,
  options: ApplyWatermarkOptions = {},
): Promise<Uint8Array> {
  return applyDocumentLayers(inputBytes, [config], options);
}
