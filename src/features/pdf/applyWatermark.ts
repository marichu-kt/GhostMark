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
import type { WatermarkConfig } from "../../types/watermark";
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

export async function applyWatermark(
  inputBytes: Uint8Array,
  config: WatermarkConfig,
  options: ApplyWatermarkOptions = {},
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(inputBytes.slice(), { updateMetadata: false });
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const selectedPages = resolvePageRules(config.pages, pages.length);

  let embeddedImage: PDFImage | null = null;
  if (config.type === "image" && config.imageData && config.imageMimeType) {
    embeddedImage =
      config.imageMimeType === "image/png"
        ? await pdfDoc.embedPng(config.imageData)
        : await pdfDoc.embedJpg(config.imageData);
  }

  for (const pageIndex of selectedPages) {
    const page = pages[pageIndex];

    switch (config.type) {
      case "text":
        drawTextWatermark(page, boldFont, config);
        break;
      case "pattern":
        drawPatternWatermark(page, boldFont, config);
        break;
      case "classification-banner":
        drawClassificationBanner(page, boldFont, config);
        break;
      case "seal":
        drawSeal(page, regularFont, boldFont, config);
        break;
      case "image":
        if (embeddedImage) {
          await drawImageWatermark(page, embeddedImage, config);
        }
        break;
      default:
        drawTextWatermark(page, boldFont, config);
        break;
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
