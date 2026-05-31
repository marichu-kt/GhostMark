import type { DocumentLayer } from "../../types/watermark";
import { resolvePageRules } from "./pageRules";

export const FLATTENED_EXPORT_SCALE = 1.65;
export const MAX_EXPORT_CANVAS_PIXELS = 18_000_000;

export interface FlattenedExportPagePlan {
  pageIndex: number;
  pageNumber: number;
  layerIds: string[];
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
