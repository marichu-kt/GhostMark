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
import { resolvePageRules } from "./pageRules";

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
    page.drawText(text, {
      x: centerX - textWidth / 2,
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
  const pdfDoc = await PDFDocument.load(inputBytes.slice(), { updateMetadata: false });
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const embeddedImages = new Map<string, PDFImage>();

  for (const layer of layers) {
    if (!layer.enabled) {
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
