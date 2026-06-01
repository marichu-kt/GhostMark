import { createSafeLayerRenderModel, type SafeLayerRenderModel } from "./safelayerRenderer";
import type { DocumentLayer } from "../../types/watermark";

export interface SafeLayerSvgInput {
  layer: DocumentLayer;
  pageNumber: number;
  width: number;
  height: number;
  quality: "preview" | "export";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeHexColor(hex: string): string {
  const normalized = hex.replace("#", "").trim();
  return /^[0-9a-fA-F]{6}$/.test(normalized) ? `#${normalized}` : "#2f343a";
}

export function createSafeLayerSvgRenderModel(input: SafeLayerSvgInput): SafeLayerRenderModel {
  return createSafeLayerRenderModel({
    seed: `${input.layer.safeLayerSeed || ""}|${input.layer.id}`,
    text: input.layer.text,
    pageNumber: input.pageNumber,
    width: input.width,
    height: input.height,
    quality: input.quality,
  });
}

export function createSafeLayerSvgMarkup(input: SafeLayerSvgInput): { model: SafeLayerRenderModel; svg: string } {
  const model = createSafeLayerSvgRenderModel(input);
  const color = normalizeHexColor(input.layer.color);
  const defs = model.textRows
    .map((row) => `<path id="${escapeXml(row.id)}" d="${escapeXml(row.path)}" fill="none"/>`)
    .join("");
  const textRows = model.textRows
    .map(
      (row) =>
        `<text fill="${color}" font-family="Arial, sans-serif" font-size="${model.fontSize}" font-weight="700" letter-spacing="1" opacity="${row.opacity}"><textPath href="#${escapeXml(row.id)}" startOffset="${escapeXml(row.startOffset)}">${escapeXml(row.text)}</textPath></text>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}" preserveAspectRatio="none" opacity="${model.textOpacity}" style="width:100%;height:100%;display:block"><defs>${defs}</defs><g transform="${escapeXml(model.textTransform)}">${textRows}</g></svg>`;

  return { model, svg };
}

export async function drawSvgMarkupToCanvas(input: {
  context: CanvasRenderingContext2D;
  svg: string;
  width: number;
  height: number;
}): Promise<boolean> {
  const { context, svg, width, height } = input;
  const encodedSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  if (typeof Image === "undefined") {
    return false;
  }

  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      context.drawImage(image, 0, 0, width, height);
      resolve(true);
    };
    image.onerror = () => resolve(false);
    image.src = encodedSvg;
  });
}
