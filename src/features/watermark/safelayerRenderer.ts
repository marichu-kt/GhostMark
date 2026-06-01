export interface SafeLayerRendererConfig {
  seed: string;
  text: string;
  pageNumber: number;
  width: number;
  height: number;
  quality?: "preview" | "export";
}

export interface SafeLayerTextPathRow {
  id: string;
  path: string;
  text: string;
  startOffset: string;
  offsetRatio: number;
  y: number;
  amplitude: number;
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
  rotation: number;
}

export const SAFELAYER_PREVIEW_PAGE_LIMIT = 3;
export const SAFELAYER_TEXT_SEPARATOR = "◆";
export const SAFELAYER_FONT_SIZE = 7;
export const SAFELAYER_OPACITY = 0.55;
export const SAFELAYER_ROW_SPACING = 14;
export const SAFELAYER_WAVE_AMPLITUDE = 7;
export const SAFELAYER_TEXT_SPACING = 116;
export const SAFELAYER_LINE_SPACING = SAFELAYER_ROW_SPACING / 0.22;
export const SAFELAYER_WAVE_STRENGTH = SAFELAYER_WAVE_AMPLITUDE / 0.24;
export const SAFELAYER_CONTOUR_STRENGTH = 22;
export const SAFELAYER_HOLOGRAPHIC_INTENSITY = 0.32;
export const SAFELAYER_PREVIEW_CONTOUR_RESOLUTION = 92;
export const SAFELAYER_EXPORT_CONTOUR_RESOLUTION = 128;
export const SAFELAYER_PREVIEW_CONTOUR_LEVELS = 24;
export const SAFELAYER_EXPORT_CONTOUR_LEVELS = 36;
const SAFELAYER_DISTORTION_MULTIPLIER = 1;
const SAFELAYER_ROTATION_MIN = -45;
const SAFELAYER_ROTATION_MAX = 45;

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

function getSafeLayerPageSeed(config: SafeLayerRendererConfig, text: string): string {
  return `${config.seed}|${text}|page:${config.pageNumber}|size:${Math.round(config.width)}x${Math.round(config.height)}`;
}

export function getSafeLayerPageRotation(config: SafeLayerRendererConfig, text = cleanSafeLayerText(config.text)): number {
  const seed = hashString(getSafeLayerPageSeed(config, text));
  const random = randomFromSeed(seed);

  return SAFELAYER_ROTATION_MIN + random() * (SAFELAYER_ROTATION_MAX - SAFELAYER_ROTATION_MIN);
}

export interface SafeLayerWavePoint {
  x: number;
  y: number;
  angle: number;
  distance: number;
}

interface CubicSegment {
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  p3: { x: number; y: number };
}

export function buildExactWavePath(width: number, y: number): string {
  let path = `M0 ${y}`;
  let x = 0;

  path += ` C${x + 22} ${y - 7}, ${x + 44} ${y + 7}, ${x + 66} ${y}`;
  x = 66;

  while (x < width + 2200) {
    path += ` S${x + 44} ${y - 7}, ${x + 66} ${y}`;
    path += ` S${x + 110} ${y + 7}, ${x + 132} ${y}`;
    x += 132;
  }

  return path;
}

function cubicPoint(segment: CubicSegment, t: number) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: mt2 * mt * segment.p0.x + 3 * mt2 * t * segment.p1.x + 3 * mt * t2 * segment.p2.x + t2 * t * segment.p3.x,
    y: mt2 * mt * segment.p0.y + 3 * mt2 * t * segment.p1.y + 3 * mt * t2 * segment.p2.y + t2 * t * segment.p3.y,
  };
}

function cubicTangent(segment: CubicSegment, t: number) {
  const mt = 1 - t;

  return {
    x:
      3 * mt * mt * (segment.p1.x - segment.p0.x) +
      6 * mt * t * (segment.p2.x - segment.p1.x) +
      3 * t * t * (segment.p3.x - segment.p2.x),
    y:
      3 * mt * mt * (segment.p1.y - segment.p0.y) +
      6 * mt * t * (segment.p2.y - segment.p1.y) +
      3 * t * t * (segment.p3.y - segment.p2.y),
  };
}

function reflect(point: { x: number; y: number }, around: { x: number; y: number }) {
  return { x: around.x * 2 - point.x, y: around.y * 2 - point.y };
}

function createWaveSegments(width: number, y: number): CubicSegment[] {
  const segments: CubicSegment[] = [];
  let current = { x: 0, y };
  let previousControl = { x: 44, y: y + SAFELAYER_WAVE_AMPLITUDE };
  let segment: CubicSegment = {
    p0: current,
    p1: { x: 22, y: y - SAFELAYER_WAVE_AMPLITUDE },
    p2: previousControl,
    p3: { x: 66, y },
  };
  segments.push(segment);
  current = segment.p3;

  while (current.x < width + 2200) {
    segment = {
      p0: current,
      p1: reflect(previousControl, current),
      p2: { x: current.x + 44, y: y - SAFELAYER_WAVE_AMPLITUDE },
      p3: { x: current.x + 66, y },
    };
    segments.push(segment);
    previousControl = segment.p2;
    current = segment.p3;

    segment = {
      p0: current,
      p1: reflect(previousControl, current),
      p2: { x: current.x + 44, y: y + SAFELAYER_WAVE_AMPLITUDE },
      p3: { x: current.x + 66, y },
    };
    segments.push(segment);
    previousControl = segment.p2;
    current = segment.p3;
  }

  return segments;
}

export function sampleSafeLayerWavePath(width: number, y: number, samplesPerSegment = 10): SafeLayerWavePoint[] {
  const points: SafeLayerWavePoint[] = [];
  let distance = 0;
  let previous: { x: number; y: number } | null = null;

  for (const segment of createWaveSegments(width, y)) {
    for (let index = 0; index <= samplesPerSegment; index += 1) {
      if (points.length > 0 && index === 0) {
        continue;
      }

      const t = index / samplesPerSegment;
      const point = cubicPoint(segment, t);
      const tangent = cubicTangent(segment, t);

      if (previous) {
        distance += Math.hypot(point.x - previous.x, point.y - previous.y);
      }

      points.push({
        x: point.x,
        y: point.y,
        angle: Math.atan2(tangent.y, tangent.x),
        distance,
      });
      previous = point;
    }
  }

  return points;
}

export function getSafeLayerPointAtDistance(points: SafeLayerWavePoint[], distance: number): SafeLayerWavePoint | null {
  if (points.length === 0) {
    return null;
  }

  if (distance <= 0) {
    return points[0];
  }

  const last = points[points.length - 1];

  if (distance >= last.distance) {
    return last;
  }

  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];

    if (current.distance < distance) {
      continue;
    }

    const span = Math.max(0.0001, current.distance - previous.distance);
    const t = (distance - previous.distance) / span;

    return {
      x: previous.x + (current.x - previous.x) * t,
      y: previous.y + (current.y - previous.y) * t,
      angle: previous.angle + (current.angle - previous.angle) * t,
      distance,
    };
  }

  return last;
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
  const targetResolution =
    config.quality === "preview" ? SAFELAYER_PREVIEW_CONTOUR_RESOLUTION : SAFELAYER_EXPORT_CONTOUR_RESOLUTION;
  const resolution = Math.min(targetResolution, Math.max(56, Math.round(width / 6)));
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

  const lineCount =
    config.quality === "preview" ? SAFELAYER_PREVIEW_CONTOUR_LEVELS : SAFELAYER_EXPORT_CONTOUR_LEVELS;
  const start = min + (max - min) * 0.07;
  const end = min + (max - min) * 0.97;
  const segments: SafeLayerContourSegment[] = [];
  const tones: SafeLayerContourSegment["tone"][] = ["primary", "red", "blue", "violet"];
  const baseOpacity = Math.min(0.34, Math.max(0.06, SAFELAYER_OPACITY * 0.42));

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
  const seed = hashString(getSafeLayerPageSeed(config, text));
  const random = randomFromSeed(seed);
  const rotation = getSafeLayerPageRotation(config, text);
  const distortion = SAFELAYER_DISTORTION_MULTIPLIER;
  const rowSpacing = SAFELAYER_ROW_SPACING * distortion;
  const hugeWidth = config.width * 3.8;
  const hugeHeight = config.height * 3.8;
  const phrase = `${text} ${SAFELAYER_TEXT_SEPARATOR} `;
  const textRows: SafeLayerTextPathRow[] = [];
  const rowCount = Math.ceil(hugeHeight / rowSpacing);

  for (let index = 0; index < rowCount; index += 1) {
    const y = index * rowSpacing + SAFELAYER_WAVE_AMPLITUDE;
    const offsetRatio = (index % 2 === 0 ? 0 : 0.03) + random() * 0.008;
    const offset = `${(offsetRatio * 100).toFixed(2)}%`;
    const row = {
      id: `safelayer-wave-${seed}-${index}`,
      path: buildExactWavePath(hugeWidth, y),
      text: phrase.repeat(90),
      startOffset: offset,
      offsetRatio,
      y,
      amplitude: SAFELAYER_WAVE_AMPLITUDE,
      opacity: 1,
    };
    textRows.push(row);
  }

  return {
    text,
    textRows,
    contourSegments: createContourSegments(config, seed),
    textTransform: `translate(${-config.width * 0.9} ${-config.height * 0.9}) rotate(${rotation} ${config.width * 1.4} ${config.height * 1.4})`,
    fontSize: SAFELAYER_FONT_SIZE,
    textOpacity: SAFELAYER_OPACITY,
    rotation,
  };
}
