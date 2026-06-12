import type { DocumentLayer } from "../../types/watermark";
import { resolvePageRules } from "./pageRules";

export const FLATTENED_EXPORT_SCALE = 2;
export const MAX_EXPORT_CANVAS_PIXELS = 32_000_000;

export type FlattenedExportQualityMode = "small" | "balanced" | "high";

export interface FlattenedExportQualitySettings {
  imageType: "image/jpeg";
  imageQuality: number;
  renderScale: number;
  maxCanvasPixels: number;
}

export const DEFAULT_FLATTENED_EXPORT_QUALITY: FlattenedExportQualityMode = "balanced";

export const FLATTENED_EXPORT_QUALITY_PRESETS: Record<
  FlattenedExportQualityMode,
  FlattenedExportQualitySettings
> = {
  small: {
    imageType: "image/jpeg",
    imageQuality: 0.78,
    renderScale: 1.5,
    maxCanvasPixels: 18_000_000,
  },
  balanced: {
    imageType: "image/jpeg",
    imageQuality: 0.9,
    renderScale: FLATTENED_EXPORT_SCALE,
    maxCanvasPixels: 28_000_000,
  },
  high: {
    imageType: "image/jpeg",
    imageQuality: 0.92,
    renderScale: 2.25,
    maxCanvasPixels: MAX_EXPORT_CANVAS_PIXELS,
  },
};

export interface FlattenedExportPagePlan {
  pageIndex: number;
  pageNumber: number;
  layerIds: string[];
}

export function resolveFlattenedExportQuality(
  mode: FlattenedExportQualityMode = DEFAULT_FLATTENED_EXPORT_QUALITY,
): FlattenedExportQualitySettings {
  return FLATTENED_EXPORT_QUALITY_PRESETS[mode] ?? FLATTENED_EXPORT_QUALITY_PRESETS.balanced;
}

export function getFlattenedExportPageIndexes(totalPages: number): number[] {
  return Array.from({ length: Math.max(0, totalPages) }, (_, pageIndex) => pageIndex);
}

export function buildFlattenedExportPlan(layers: DocumentLayer[], totalPages: number): FlattenedExportPagePlan[] {
  const pageIndexes = getFlattenedExportPageIndexes(totalPages);
  const layerPages = new Map<string, number[]>();

  for (const layer of layers) {
    if (!layer.enabled) {
      continue;
    }

    layerPages.set(layer.id, resolvePageRules(layer.pages, totalPages));
  }

  return pageIndexes.map((pageIndex) => ({
    pageIndex,
    pageNumber: pageIndex + 1,
    layerIds: layers
      .filter((layer) => layer.enabled && (layerPages.get(layer.id) ?? []).includes(pageIndex))
      .map((layer) => layer.id),
  }));
}
