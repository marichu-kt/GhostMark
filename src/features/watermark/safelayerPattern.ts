import type { SafeLayerDistortion, SafeLayerStyle } from "../../types/watermark";

export interface SafeLayerPatternConfig {
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

export interface SafeLayerTextMark {
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  text: string;
}

export interface SafeLayerLine {
  points: Array<{ x: number; y: number }>;
  opacity: number;
  tone?: "primary" | "red" | "blue" | "violet";
}

export interface SafeLayerPattern {
  textMarks: SafeLayerTextMark[];
  waveLines: SafeLayerLine[];
  contourLines: SafeLayerLine[];
  holographicLines: SafeLayerLine[];
}

export const SAFELAYER_PREVIEW_PAGE_LIMIT = 10;

const distortionMultiplier: Record<SafeLayerDistortion, number> = {
  soft: 0.62,
  medium: 1,
  strong: 1.45,
};

export function createDeterministicNoise(seed: string): () => number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function boundedOpacity(base: number, noise: number, cap = 0.4): number {
  return Math.min(cap, Math.max(0.035, base * (0.66 + noise * 0.5)));
}

function createWavePoints(input: {
  width: number;
  baseY: number;
  amplitude: number;
  phase: number;
  frequency: number;
  noise: () => number;
  distortion: number;
}) {
  const pointCount = 18;

  return Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const secondary = Math.sin(progress * Math.PI * (input.frequency * 0.55) + input.phase * 1.7);
    const y =
      input.baseY +
      Math.sin(progress * Math.PI * input.frequency + input.phase) * input.amplitude +
      secondary * input.amplitude * 0.34 +
      (input.noise() - 0.5) * 9 * input.distortion;

    return { x: progress * input.width, y };
  });
}

function normalizeSafeLayerText(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean || "PROTECTED";
}

function createPageContourLines(input: {
  width: number;
  height: number;
  noise: () => number;
  opacity: number;
  distortion: number;
  contourStrength: number;
}): SafeLayerLine[] {
  const gridX = 22;
  const gridY = Math.max(16, Math.round((gridX * input.height) / Math.max(1, input.width)));
  const cells: number[][] = [];
  const blobCount = 9;
  const blobs = Array.from({ length: blobCount }, () => ({
    x: input.noise(),
    y: input.noise(),
    radius: 0.12 + input.noise() * 0.26,
    weight: 0.45 + input.noise() * 1.1,
  }));

  for (let y = 0; y <= gridY; y += 1) {
    cells[y] = [];

    for (let x = 0; x <= gridX; x += 1) {
      const nx = x / gridX;
      const ny = y / gridY;
      let value = Math.sin(nx * Math.PI * 4.2 + input.noise() * 0.5) * 0.16;
      value += Math.cos(ny * Math.PI * 3.7 + input.noise() * 0.5) * 0.16;

      for (const blob of blobs) {
        const dx = nx - blob.x;
        const dy = ny - blob.y;
        const distance = dx * dx + dy * dy;
        value += Math.exp(-distance / (blob.radius * blob.radius)) * blob.weight;
      }

      cells[y][x] = value;
    }
  }

  const minValue = Math.min(...cells.flat());
  const maxValue = Math.max(...cells.flat());
  const levels = [0.28, 0.42, 0.56, 0.7].map((level) => minValue + (maxValue - minValue) * level);
  const lines: SafeLayerLine[] = [];

  for (const level of levels) {
    for (let y = 0; y < gridY; y += 1) {
      const rowSegments: Array<{ x: number; y: number }> = [];

      for (let x = 0; x < gridX; x += 1) {
        const topLeft = cells[y][x];
        const topRight = cells[y][x + 1];
        const bottomLeft = cells[y + 1][x];
        const bottomRight = cells[y + 1][x + 1];
        const crosses =
          (topLeft < level && topRight >= level) ||
          (topLeft >= level && topRight < level) ||
          (bottomLeft < level && bottomRight >= level) ||
          (bottomLeft >= level && bottomRight < level) ||
          (topLeft < level && bottomLeft >= level) ||
          (topLeft >= level && bottomLeft < level) ||
          (topRight < level && bottomRight >= level) ||
          (topRight >= level && bottomRight < level);

        if (!crosses) {
          if (rowSegments.length > 2) {
            lines.push({
              points: rowSegments,
              opacity: boundedOpacity(input.opacity * 0.44, input.noise(), 0.18),
              tone: "primary",
            });
          }

          rowSegments.length = 0;
          continue;
        }

        const cellCenterX = ((x + 0.5) / gridX) * input.width;
        const cellCenterY = ((y + 0.5) / gridY) * input.height;
        rowSegments.push({
          x: cellCenterX + (input.noise() - 0.5) * input.contourStrength * 0.38 * input.distortion,
          y: cellCenterY + (input.noise() - 0.5) * input.contourStrength * 0.38 * input.distortion,
        });
      }

      if (rowSegments.length > 2) {
        lines.push({
          points: rowSegments,
          opacity: boundedOpacity(input.opacity * 0.44, input.noise(), 0.18),
          tone: "primary",
        });
      }
    }
  }

  return lines;
}

export function createSafeLayerPattern(config: SafeLayerPatternConfig): SafeLayerPattern {
  const text = normalizeSafeLayerText(config.text);
  const seed = `${config.seed}|${text}|${config.style}|${config.distortion}|${config.rotation}`;
  const noise = createDeterministicNoise(seed);
  const distortion = distortionMultiplier[config.distortion];
  const textSpacing = Math.max(70, config.textSpacing);
  const lineSpacing = Math.max(36, config.lineSpacing);
  const rowSpacing = Math.max(34, lineSpacing * 0.78);
  const opacity = Math.min(0.4, Math.max(0.04, config.opacity));
  const holographicIntensity = Math.min(1, Math.max(0, config.holographicIntensity));
  const includeText = true;
  const includeWaves = config.style === "mixed" || config.style === "waves";
  const includeContours = config.style === "mixed" || config.style === "contours";
  const textMarks: SafeLayerTextMark[] = [];
  const waveLines: SafeLayerLine[] = [];
  const contourLines: SafeLayerLine[] = [];
  const holographicLines: SafeLayerLine[] = [];

  if (includeText) {
    const rows = Math.ceil(config.height / rowSpacing) + 6;
    const columns = Math.ceil(config.width / textSpacing) + 8;

    for (let row = -3; row < rows; row += 1) {
      const rowPhase = noise() * Math.PI * 2;
      const baseY = row * rowSpacing + (noise() - 0.5) * 12 * distortion;
      const rowRotation = -12 + Math.sin(rowPhase) * 7 * distortion;
      const rowOffset = (row % 2 ? textSpacing * 0.52 : 0) + (noise() - 0.5) * textSpacing * 0.28;

      for (let column = -3; column < columns; column += 1) {
        const x = column * textSpacing + rowOffset + (noise() - 0.5) * 16 * distortion;
        const waveY =
          Math.sin((x / Math.max(1, config.width)) * Math.PI * 3.4 + rowPhase) *
          config.waveStrength *
          0.42 *
          distortion;
        const y = baseY + waveY + (noise() - 0.5) * 9 * distortion;

        textMarks.push({
          x,
          y,
          text,
          rotation: config.rotation + rowRotation + Math.cos((x / Math.max(1, config.width)) * Math.PI * 2 + rowPhase) * 4,
          opacity: boundedOpacity(opacity, noise(), 0.34),
        });
      }
    }
  }

  if (includeWaves) {
    const lineCount = Math.ceil(config.height / lineSpacing) + 5;

    for (let line = -2; line < lineCount; line += 1) {
      const phase = noise() * Math.PI * 2;
      const amplitude = Math.max(4, config.waveStrength) * (0.55 + noise() * 0.55) * distortion;
      const points = createWavePoints({
        width: config.width,
        baseY: line * lineSpacing + (noise() - 0.5) * 12,
        amplitude,
        phase,
        frequency: 2.4 + noise() * 2.2,
        noise,
        distortion,
      });

      waveLines.push({
        points,
        opacity: boundedOpacity(opacity * 0.56, noise(), 0.24),
        tone: "primary",
      });
    }
  }

  if (includeContours) {
    contourLines.push(
      ...createPageContourLines({
        width: config.width,
        height: config.height,
        noise,
        opacity,
        distortion,
        contourStrength: config.contourStrength,
      }),
    );
  }

  if (holographicIntensity > 0) {
    const holoCount = Math.max(5, Math.round(7 + holographicIntensity * 10));
    const tones: SafeLayerLine["tone"][] = ["red", "blue", "violet"];

    for (let index = 0; index < holoCount; index += 1) {
      const baseY = ((index + noise() * 0.8) / holoCount) * config.height;
      const points = createWavePoints({
        width: config.width,
        baseY,
        amplitude: (config.waveStrength * 0.34 + 8) * distortion,
        phase: noise() * Math.PI * 2,
        frequency: 1.7 + noise() * 1.2,
        noise,
        distortion,
      });

      holographicLines.push({
        points,
        opacity: Math.min(0.16, Math.max(0.025, holographicIntensity * opacity * (0.38 + noise() * 0.36))),
        tone: tones[index % tones.length],
      });
    }
  }

  return { textMarks, waveLines, contourLines, holographicLines };
}
