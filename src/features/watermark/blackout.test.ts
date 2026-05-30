import { describe, expect, it } from "vitest";
import type { DocumentLayer } from "../../types/watermark";
import { getBlackoutPageIndexes, getBlackoutRectsForExport, normalizeBlackoutRect } from "./blackout";
import { createLayerForType } from "./defaults";
import { isPageVisibleInPreview } from "../pdf/largePdf";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "test-id" } as unknown as Crypto,
  });
}

function blackoutLayer(patch: Partial<DocumentLayer> = {}): DocumentLayer {
  return {
    ...createLayerForType("blackout"),
    id: "blackout",
    blackoutRects: [{ id: "rect-1", page: 200, x: -10, y: 20, width: 0, height: 12 }],
    ...patch,
  };
}

describe("blackout helpers", () => {
  it("normalizes rectangle dimensions", () => {
    expect(normalizeBlackoutRect({ id: "a", page: 0, x: -3, y: -4, width: 0, height: -5 })).toEqual({
      id: "a",
      page: 1,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it("marks only pages with blackout rectangles for flattening", () => {
    expect(getBlackoutPageIndexes([blackoutLayer()], 1000)).toEqual([199]);
  });

  it("does not mark pages without blackout rectangles", () => {
    expect(getBlackoutPageIndexes([createLayerForType("text")], 1000)).toEqual([]);
  });

  it("keeps blackout export independent from Large PDF Mode preview limits", () => {
    expect(isPageVisibleInPreview(200, 1000)).toBe(false);
    expect(getBlackoutRectsForExport([blackoutLayer()], 1000).has(199)).toBe(true);
  });
});
