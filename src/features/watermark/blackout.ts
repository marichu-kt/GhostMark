import type { BlackoutRect, DocumentLayer } from "../../types/watermark";
import { resolvePageRules } from "../pdf/pageRules";

export function normalizeBlackoutRect(rect: BlackoutRect): BlackoutRect {
  return {
    ...rect,
    page: Math.max(1, Math.floor(rect.page)),
    x: Math.max(0, rect.x),
    y: Math.max(0, rect.y),
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height),
  };
}

export function getBlackoutRectsForExport(layers: DocumentLayer[], totalPages: number): Map<number, BlackoutRect[]> {
  const pages = new Map<number, BlackoutRect[]>();

  for (const layer of layers) {
    if (!layer.enabled || layer.type !== "blackout") {
      continue;
    }

    let allowedPages: Set<number> | null = null;
    try {
      allowedPages = new Set(resolvePageRules(layer.pages, totalPages).map((index) => index + 1));
    } catch {
      allowedPages = null;
    }

    for (const rawRect of layer.blackoutRects) {
      const rect = normalizeBlackoutRect(rawRect);

      if (rect.page > totalPages || (allowedPages && !allowedPages.has(rect.page))) {
        continue;
      }

      const pageIndex = rect.page - 1;
      const existing = pages.get(pageIndex) ?? [];
      existing.push(rect);
      pages.set(pageIndex, existing);
    }
  }

  return pages;
}

export function getBlackoutPageIndexes(layers: DocumentLayer[], totalPages: number): number[] {
  return Array.from(getBlackoutRectsForExport(layers, totalPages).keys()).sort((a, b) => a - b);
}
