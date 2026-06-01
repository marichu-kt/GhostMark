import type { DocumentLayer } from "../../types/watermark";
import {
  createSafeLayerRenderModel,
  getSafeLayerWaveY,
  type SafeLayerRenderModel,
} from "./safelayerRenderer";

interface SafeLayerCanvasRenderInput {
  context: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  layer: DocumentLayer;
  pageNumber: number;
  quality: "preview" | "export";
  imageData?: ImageData | null;
}

function hexToCss(hex: string): string {
  const normalized = hex.replace("#", "").trim();
  return /^[0-9a-fA-F]{6}$/.test(normalized) ? `#${normalized}` : "#2f343a";
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
  fallbackColor: string,
  opacity: number,
  thickness: number,
  imageData?: ImageData | null,
) {
  if (!Number.isFinite(start.x) || !Number.isFinite(start.y) || !Number.isFinite(end.x) || !Number.isFinite(end.y)) {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = thickness;

  if (imageData) {
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

function drawSafeLayerTextRows(
  context: CanvasRenderingContext2D,
  model: SafeLayerRenderModel,
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
      context.fillText(phrase, x, getSafeLayerWaveY(row, x));
    }
  }

  context.restore();
}

export function drawSafeLayerToCanvas({
  context,
  canvas,
  layer,
  pageNumber,
  quality,
  imageData = null,
}: SafeLayerCanvasRenderInput): SafeLayerRenderModel {
  const text = (layer.text.trim() || "PROTECTED").toUpperCase();
  const model = createSafeLayerRenderModel({
    seed: `${layer.safeLayerSeed || ""}|${layer.id}`,
    text,
    pageNumber,
    width: canvas.width,
    height: canvas.height,
    quality,
  });
  const color = hexToCss(layer.color);
  const toneColor = {
    primary: color,
    red: "#d95a58",
    blue: "#47a5d8",
    violet: "#8f74d9",
  };
  const lineWidth = quality === "preview" ? 0.7 : 0.9;

  for (const segment of model.contourSegments) {
    drawCanvasSegment(
      context,
      segment.start,
      segment.end,
      toneColor[segment.tone],
      segment.opacity,
      lineWidth,
      imageData,
    );
  }

  drawSafeLayerTextRows(context, model, color, canvas);
  return model;
}
