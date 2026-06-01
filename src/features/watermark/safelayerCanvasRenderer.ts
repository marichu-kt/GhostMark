import type { DocumentLayer } from "../../types/watermark";
import {
  getSafeLayerPointAtDistance,
  sampleSafeLayerWavePath,
  type SafeLayerRenderModel,
} from "./safelayerRenderer";
import { createSafeLayerSvgMarkup, drawSvgMarkupToCanvas } from "./safelayerSvgRenderer";

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

export function drawSafeLayerContoursToCanvas(input: {
  context: CanvasRenderingContext2D;
  model: SafeLayerRenderModel;
  layer: DocumentLayer;
  quality: "preview" | "export";
  imageData?: ImageData | null;
}) {
  const color = hexToCss(input.layer.color);
  const toneColor = {
    primary: color,
    red: "#d95a58",
    blue: "#47a5d8",
    violet: "#8f74d9",
  };
  const lineWidth = input.quality === "preview" ? 0.7 : 0.9;

  for (const segment of input.model.contourSegments) {
    drawCanvasSegment(
      input.context,
      segment.start,
      segment.end,
      toneColor[segment.tone],
      segment.opacity,
      lineWidth,
      input.imageData,
    );
  }
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
  const translateX = -canvas.width * 0.9;
  const translateY = -canvas.height * 0.9;
  const rotation = (model.rotation * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const inverseCorners = [
    { x: -160, y: -160 },
    { x: canvas.width + 160, y: -160 },
    { x: canvas.width + 160, y: canvas.height + 160 },
    { x: -160, y: canvas.height + 160 },
  ].map((point) => {
    const translatedX = point.x - translateX - pivotX;
    const translatedY = point.y - translateY - pivotY;

    return {
      x: translatedX * cos + translatedY * sin + pivotX,
      y: -translatedX * sin + translatedY * cos + pivotY,
    };
  });
  const visibleMinX = Math.max(0, Math.min(...inverseCorners.map((point) => point.x)));
  const visibleMaxX = Math.min(hugeWidth, Math.max(...inverseCorners.map((point) => point.x)));
  const visibleMinY = Math.min(...inverseCorners.map((point) => point.y));
  const visibleMaxY = Math.max(...inverseCorners.map((point) => point.y));

  context.save();
  context.translate(translateX, translateY);
  context.translate(pivotX, pivotY);
  context.rotate(rotation);
  context.translate(-pivotX, -pivotY);
  context.font = `700 ${model.fontSize}px Arial, sans-serif`;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.textAlign = "center";
  const letterSpacing = 1;
  const averageCharacterWidth = Math.max(2, context.measureText(phrase).width / phrase.length + letterSpacing);
  const chunkLength = 8;

  for (const row of model.textRows) {
    if (row.y < visibleMinY - 36 || row.y > visibleMaxY + 36) {
      continue;
    }

    context.globalAlpha = row.opacity * model.textOpacity;
    const points = sampleSafeLayerWavePath(hugeWidth, row.y, 3);
    const pathLength = points[points.length - 1]?.distance ?? 0;
    const offsetDistance = row.offsetRatio * pathLength;
    let distance = Math.max(offsetDistance, visibleMinX - 160);
    let characterIndex = Math.max(0, Math.floor((distance - offsetDistance) / averageCharacterWidth));
    const endDistance = Math.min(pathLength, visibleMaxX + 160);

    while (distance < endDistance) {
      let chunk = "";

      for (let offset = 0; offset < chunkLength; offset += 1) {
        chunk += phrase[(characterIndex + offset) % phrase.length];
      }

      const width = Math.max(1, context.measureText(chunk).width + letterSpacing * chunk.length);
      const point = getSafeLayerPointAtDistance(points, distance + width / 2);

      if (!point) {
        break;
      }

      context.save();
      context.translate(point.x, point.y);
      context.rotate(point.angle);
      context.fillText(chunk, 0, 0);
      context.restore();
      distance += width;
      characterIndex += chunkLength;
    }
  }

  context.restore();
}

export async function drawSafeLayerToCanvas({
  context,
  canvas,
  layer,
  pageNumber,
  quality,
  imageData = null,
}: SafeLayerCanvasRenderInput): Promise<SafeLayerRenderModel> {
  const text = (layer.text.trim() || "PROTECTED").toUpperCase();
  const { model, svg } = createSafeLayerSvgMarkup({
    layer: { ...layer, text },
    pageNumber,
    width: canvas.width,
    height: canvas.height,
    quality,
  });
  const color = hexToCss(layer.color);

  drawSafeLayerContoursToCanvas({ context, model, layer, quality, imageData });

  const drewSvgText = await drawSvgMarkupToCanvas({
    context,
    svg,
    width: canvas.width,
    height: canvas.height,
  });

  if (!drewSvgText) {
    drawSafeLayerTextRows(context, model, color, canvas);
  }

  return model;
}
