import * as pdfjsLib from "pdfjs-dist";
import type { RedactionRectangle } from "../../types/watermark";
import { findMatchRanges } from "./redactionText";
import "./renderPdfPreview";

interface TextItemLike {
  str?: string;
  width?: number;
  height?: number;
  transform?: number[];
}

export interface RedactionSearchOptions {
  query: string;
  caseSensitive: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function findRedactionMatches(
  bytes: Uint8Array,
  { query, caseSensitive }: RedactionSearchOptions,
): Promise<RedactionRectangle[]> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const rectangles: RedactionRectangle[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      for (const rawItem of content.items) {
        const item = rawItem as TextItemLike;
        const text = item.str ?? "";
        const transform = item.transform;
        const matches = findMatchRanges(text, query, caseSensitive);

        if (!text || !transform || matches.length === 0) {
          continue;
        }

        const transformed = pdfjsLib.Util.transform(viewport.transform, transform);
        const itemWidth = Math.max(4, item.width ?? text.length * 7);
        const itemHeight = Math.max(8, item.height ?? (Math.abs(transformed[3]) || 10));
        const textLength = Math.max(1, text.length);

        for (const [start, end] of matches) {
          const startRatio = start / textLength;
          const endRatio = end / textLength;
          const left = transformed[4] + itemWidth * startRatio;
          const top = transformed[5] - itemHeight;
          const width = Math.max(8, itemWidth * (endRatio - startRatio));
          const padding = 2;

          rectangles.push({
            id: crypto.randomUUID(),
            page: pageNumber,
            x: clamp(left - padding, 0, viewport.width),
            y: clamp(viewport.height - top - itemHeight - padding, 0, viewport.height),
            width: clamp(width + padding * 2, 1, viewport.width),
            height: clamp(itemHeight + padding * 2, 1, viewport.height),
          });
        }
      }
    }
  } finally {
    await pdf.destroy();
  }

  return rectangles;
}
