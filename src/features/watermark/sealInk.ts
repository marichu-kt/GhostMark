import type { SealInkStyle } from "../../types/watermark";

export interface SealInkProfile {
  borderOpacity: number;
  textOpacity: number;
  ghostOpacity: number;
  gapRatio: number;
  jitter: number;
  segmentCount: number;
}

export interface SealInkSegment {
  side: "top" | "right" | "bottom" | "left";
  startRatio: number;
  endRatio: number;
  opacity: number;
  offset: number;
}

export function getSealInkProfile(style: SealInkStyle = "clean"): SealInkProfile {
  switch (style) {
    case "faded-ink":
      return {
        borderOpacity: 0.62,
        textOpacity: 0.7,
        ghostOpacity: 0.1,
        gapRatio: 0.08,
        jitter: 1.15,
        segmentCount: 11,
      };
    case "real-ink":
      return {
        borderOpacity: 0.86,
        textOpacity: 0.92,
        ghostOpacity: 0.16,
        gapRatio: 0.045,
        jitter: 0.7,
        segmentCount: 10,
      };
    default:
      return {
        borderOpacity: 1,
        textOpacity: 1,
        ghostOpacity: 0,
        gapRatio: 0,
        jitter: 0,
        segmentCount: 1,
      };
  }
}

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

export function getSealSeed(input: {
  id: string;
  title: string;
  subtitle: string;
  documentId?: string;
}): string {
  return [input.id, input.title, input.subtitle, input.documentId ?? ""].join("|");
}

export function getSealInkSegments(style: SealInkStyle, seed: string): SealInkSegment[] {
  const profile = getSealInkProfile(style);

  if (style === "clean") {
    return [];
  }

  const noise = createDeterministicNoise(seed);
  const sides: SealInkSegment["side"][] = ["top", "right", "bottom", "left"];
  const segments: SealInkSegment[] = [];

  for (const side of sides) {
    for (let index = 0; index < profile.segmentCount; index += 1) {
      const baseStart = index / profile.segmentCount;
      const baseEnd = (index + 1) / profile.segmentCount;
      const gap = profile.gapRatio * (0.7 + noise() * 0.65);
      const startRatio = Math.min(0.98, baseStart + gap * 0.5);
      const endRatio = Math.max(startRatio + 0.01, baseEnd - gap * (0.65 + noise() * 0.45));

      segments.push({
        side,
        startRatio,
        endRatio: Math.min(1, endRatio),
        opacity: profile.borderOpacity * (0.78 + noise() * 0.22),
        offset: (noise() - 0.5) * profile.jitter,
      });
    }
  }

  return segments;
}
