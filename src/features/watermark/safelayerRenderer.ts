import type { SafeLayerDistortion, SafeLayerStyle } from "../../types/watermark";

export interface SafeLayerRendererConfig {
  seed: string;
  text: string;
  style: SafeLayerStyle;
  distortion: SafeLayerDistortion;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  textSpacing: number;
  lineSpacing: number;
  waveStrength: number;
  contourStrength: number;
  holographicIntensity: number;
}

export interface SafeLayerTextPathRow {
  id: string;
  path: string;
  text: string;
  startOffset: string;
  opacity: number;
}

export interface SafeLayerContourSegment {
  start: { x: number; y: number };
  end: { x: number; y: number };
  opacity: number;
  tone: "primary" | "red" | "blue" | "violet";
}

export interface SafeLayerRenderModel {
  text: string;
  textRows: SafeLayerTextPathRow[];
  contourSegments: SafeLayerContourSegment[];
  textTransform: string;
  fontSize: number;
  textOpacity: number;
}

export const SAFELAYER_PREVIEW_PAGE_LIMIT = 10;

const distortionMultiplier: Record<SafeLayerDistortion, number> = {
  soft: 0.72,
  medium: 1,
  strong: 1.32,
};

export function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return hash >>> 0;
}

export function randomFromSeed(seed: number): () => number {
  let state = seed + 0x6d2b79f5;

  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function cleanSafeLayerText(value: string): string {
  const pieces = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return pieces.length ? pieces.join(" ").toUpperCase() : "PROTECTED";
}

export function buildExactWavePath(width: number, y: number, amplitude: number): string {
  let path = `M0 ${y}`;
  let x = 0;
  const unit = 66;
  const half = unit / 1.5;

  path += ` C${x + 22} ${y - amplitude}, ${x + 44} ${y + amplitude}, ${x + unit} ${y}`;
  x = unit;

  while (x < width + 2200) {
    path += ` S${x + half} ${y - amplitude}, ${x + unit} ${y}`;
    path += ` S${x + 110} ${y + amplitude}, ${x + unit * 2} ${y}`;
    x += unit * 2;
  }

  return path;
}

function fieldValue(x: number, y: number, width: number, height: number, seed: number): number {
  const nx = x / width;
  const ny = y / height;
  const random = randomFromSeed(seed);
  let value = 0;

  for (let index = 0; index < 26; index += 1) {
    const edgeBias = random();
    let cx = -0.1 + random() * 1.2;
    let cy = -0.1 + random() * 1.2;

    if (edgeBias < 0.18) {
      cx = random() < 0.5 ? -0.08 - random() * 0.08 : 1.08 + random() * 0.08;
    }

    if (edgeBias > 0.82) {
      cy = random() < 0.5 ? -0.08 - random() * 0.08 : 1.08 + random() * 0.08;
    }

    const sx = 0.085 + random() * 0.155;
    const sy = 0.085 + random() * 0.175;
    const amplitude = 0.72 + random() * 0.58;
    const dx = (nx - cx) / sx;
    const dy = (ny - cy) / sy;
    value += amplitude * Math.exp(-(dx * dx + dy * dy));
  }

  value += 0.07 * Math.sin(nx * 18 + ny * 11 + seed * 0.001);
  value += 0.055 * Math.sin(nx * 13 - ny * 25 + seed * 0.002);
  value += 0.04 * Math.cos(nx * 31 + ny * 17 + seed * 0.003);
  return value;
}

function edgePoint(
  x1: number,
  y1: number,
  v1: number,
  x2: number,
  y2: number,
  v2: number,
  level: number,
) {
  const delta = v2 - v1;
  const t = Math.abs(delta) > 0.000001 ? (level - v1) / delta : 0.5;
  return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
}

function createContourSegments(config: SafeLayerRendererConfig, seedNumber: number): SafeLayerContourSegment[] {
  const width = config.width;
  const height = config.height;
  const resolution = Math.min(180, Math.max(80, Math.round(width / 5)));
  const columns = resolution;
  const rows = Math.max(24, Math.round((columns * height) / Math.max(1, width)));
  const dx = width / columns;
  const dy = height / rows;
  const values: number[][] = [];
  let min = Infinity;
  let max = -Infinity;

  for (let row = 0; row <= rows; row += 1) {
    values[row] = [];

    for (let column = 0; column <= columns; column += 1) {
      const value = fieldValue(column * dx, row * dy, width, height, seedNumber);
      values[row][column] = value;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }

  const lineCount = Math.round(22 + Math.min(28, Math.max(0, config.contourStrength)));
  const start = min + (max - min) * 0.07;
  const end = min + (max - min) * 0.97;
  const segments: SafeLayerContourSegment[] = [];
  const tones: SafeLayerContourSegment["tone"][] = ["primary", "red", "blue", "violet"];
  const baseOpacity = Math.min(0.34, Math.max(0.06, config.opacity * 1.5));

  for (let levelIndex = 0; levelIndex < lineCount; levelIndex += 1) {
    const level = start + ((end - start) * levelIndex) / Math.max(1, lineCount - 1);

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = column * dx;
        const y = row * dy;
        const v0 = values[row][column];
        const v1 = values[row][column + 1];
        const v2 = values[row + 1][column + 1];
        const v3 = values[row + 1][column];
        const points: Array<{ x: number; y: number }> = [];

        if ((v0 < level && v1 >= level) || (v0 >= level && v1 < level)) {
          points.push(edgePoint(x, y, v0, x + dx, y, v1, level));
        }
        if ((v1 < level && v2 >= level) || (v1 >= level && v2 < level)) {
          points.push(edgePoint(x + dx, y, v1, x + dx, y + dy, v2, level));
        }
        if ((v2 < level && v3 >= level) || (v2 >= level && v3 < level)) {
          points.push(edgePoint(x + dx, y + dy, v2, x, y + dy, v3, level));
        }
        if ((v3 < level && v0 >= level) || (v3 >= level && v0 < level)) {
          points.push(edgePoint(x, y + dy, v3, x, y, v0, level));
        }

        if (points.length === 2) {
          segments.push({
            start: points[0],
            end: points[1],
            opacity: baseOpacity,
            tone: "primary",
          });
        }

        if (points.length === 4) {
          const center = (v0 + v1 + v2 + v3) / 4;
          const pairs = center > level ? [[0, 3], [1, 2]] : [[0, 1], [2, 3]];

          for (const [startPoint, endPoint] of pairs) {
            segments.push({
              start: points[startPoint],
              end: points[endPoint],
              opacity: baseOpacity,
              tone: tones[(levelIndex + row + column) % tones.length],
            });
          }
        }
      }
    }
  }

  return segments;
}

export function createSafeLayerRenderModel(config: SafeLayerRendererConfig): SafeLayerRenderModel {
  const text = cleanSafeLayerText(config.text);
  const seed = hashString(`${config.seed}|${text}|${config.width}|${config.height}|${config.rotation}`);
  const random = randomFromSeed(seed);
  const distortion = distortionMultiplier[config.distortion];
  const waveAmplitude = Math.max(4, config.waveStrength * 0.24 * distortion);
  const rowSpacing = Math.max(10, config.lineSpacing * 0.22);
  const hugeWidth = config.width * 3.8;
  const hugeHeight = config.height * 3.8;
  const phrase = `${text} · `;
  const textRows: SafeLayerTextPathRow[] = [];
  const includeText = true;
  const includeContours = config.style === "mixed" || config.style === "contours";
  const includeWaves = config.style === "mixed" || config.style === "waves" || config.style === "text-mesh";
  const rowCount = Math.ceil(hugeHeight / rowSpacing);

  if (includeText) {
    for (let index = 0; index < rowCount; index += 1) {
      const y = index * rowSpacing + rowSpacing / 2;
      const offset = index % 2 === 0 ? "0%" : `${Math.round(2 + random() * 5)}%`;
      textRows.push({
        id: `safelayer-wave-${seed}-${index}`,
        path: buildExactWavePath(hugeWidth, y, waveAmplitude),
        text: phrase.repeat(90),
        startOffset: offset,
        opacity: Math.min(0.52, Math.max(0.08, config.opacity * (1.6 + random() * 0.45))),
      });
    }
  }

  return {
    text,
    textRows: includeWaves ? textRows : [],
    contourSegments: includeContours ? createContourSegments(config, seed) : [],
    textTransform: `translate(${-config.width * 0.9} ${-config.height * 0.9}) rotate(${config.rotation - 17} ${config.width * 1.4} ${config.height * 1.4})`,
    fontSize: Math.max(8, Math.min(18, config.textSpacing * 0.1)),
    textOpacity: Math.min(0.58, Math.max(0.1, config.opacity * 2.2)),
  };
}
