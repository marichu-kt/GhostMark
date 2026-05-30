import type {
  SafeLayerDensity,
  SafeLayerDistortion,
  SafeLayerStyle,
} from "../../types/watermark";
import { createDeterministicNoise } from "./sealInk";

export interface SafeLayerPatternConfig {
  seed: string;
  text: string;
  style: SafeLayerStyle;
  density: SafeLayerDensity;
  distortion: SafeLayerDistortion;
  width: number;
  height: number;
  opacity: number;
  textSpacing: number;
  lineSpacing: number;
  waveStrength: number;
  contourStrength: number;
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
}

export interface SafeLayerPattern {
  textMarks: SafeLayerTextMark[];
  waveLines: SafeLayerLine[];
  contourLines: SafeLayerLine[];
}

const densityMultiplier: Record<SafeLayerDensity, number> = {
  low: 0.72,
  medium: 1,
  high: 1.38,
};

const distortionMultiplier: Record<SafeLayerDistortion, number> = {
  soft: 0.55,
  medium: 1,
  strong: 1.55,
};

function boundedOpacity(base: number, noise: number): number {
  return Math.min(0.42, Math.max(0.04, base * (0.74 + noise * 0.42)));
}

export function createSafeLayerPattern(config: SafeLayerPatternConfig): SafeLayerPattern {
  const seed = `${config.seed}|${config.text}|${config.style}|${config.density}|${config.distortion}`;
  const noise = createDeterministicNoise(seed);
  const density = densityMultiplier[config.density];
  const distortion = distortionMultiplier[config.distortion];
  const textSpacing = Math.max(70, config.textSpacing / density);
  const lineSpacing = Math.max(40, config.lineSpacing / density);
  const opacity = Math.min(0.42, Math.max(0.04, config.opacity));
  const includeText = config.style === "mixed" || config.style === "text-mesh";
  const includeWaves = config.style === "mixed" || config.style === "waves";
  const includeContours = config.style === "mixed" || config.style === "contours";
  const textMarks: SafeLayerTextMark[] = [];
  const waveLines: SafeLayerLine[] = [];
  const contourLines: SafeLayerLine[] = [];

  if (includeText) {
    const columns = Math.ceil(config.width / textSpacing) + 3;
    const rows = Math.ceil(config.height / (textSpacing * 0.72)) + 3;

    for (let row = -1; row < rows; row += 1) {
      for (let column = -1; column < columns; column += 1) {
        const x = column * textSpacing + (row % 2 ? textSpacing * 0.42 : 0) + (noise() - 0.5) * 18 * distortion;
        const y = row * textSpacing * 0.72 + (noise() - 0.5) * 16 * distortion;

        textMarks.push({
          x,
          y,
          text: config.text,
          rotation: -28 + (noise() - 0.5) * 9 * distortion,
          opacity: boundedOpacity(opacity, noise()),
        });
      }
    }
  }

  if (includeWaves) {
    const lineCount = Math.ceil(config.height / lineSpacing) + 2;
    const pointCount = 14;

    for (let line = -1; line < lineCount; line += 1) {
      const points = Array.from({ length: pointCount }, (_, index) => {
        const progress = index / (pointCount - 1);
        const x = progress * config.width;
        const wave = Math.sin(progress * Math.PI * (2.2 + noise() * 1.5) + noise() * Math.PI);
        const y = line * lineSpacing + wave * config.waveStrength * distortion + (noise() - 0.5) * 8 * distortion;
        return { x, y };
      });

      waveLines.push({ points, opacity: boundedOpacity(opacity * 0.72, noise()) });
    }
  }

  if (includeContours) {
    const contourCount = Math.max(4, Math.round(8 * density));

    for (let contour = 0; contour < contourCount; contour += 1) {
      const centerX = noise() * config.width;
      const centerY = noise() * config.height;
      const radiusX = (55 + noise() * 130) * density;
      const radiusY = (32 + noise() * 92) * density;
      const pointCount = 18;
      const points = Array.from({ length: pointCount + 1 }, (_, index) => {
        const angle = (index / pointCount) * Math.PI * 2;
        const wobble = 1 + (noise() - 0.5) * 0.26 * distortion;
        return {
          x: centerX + Math.cos(angle) * radiusX * wobble,
          y: centerY + Math.sin(angle) * radiusY * wobble + Math.sin(angle * 3) * config.contourStrength * 0.18,
        };
      });

      contourLines.push({ points, opacity: boundedOpacity(opacity * 0.66, noise()) });
    }
  }

  return { textMarks, waveLines, contourLines };
}
