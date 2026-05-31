import { describe, expect, it } from "vitest";
import { createLayerForType } from "../watermark/defaults";
import { SAFELAYER_PREVIEW_PAGE_LIMIT } from "../watermark/safelayerRenderer";
import { buildFlattenedExportPlan, getFlattenedExportPageIndexes } from "./flattenedExportPlan";
import { getVisiblePageCount } from "./largePdf";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "test-id" } as unknown as Crypto,
  });
}

describe("flattened export planning", () => {
  it("preserves every source page regardless of preview limits", () => {
    expect(getVisiblePageCount(1000)).toBe(150);
    const indexes = getFlattenedExportPageIndexes(1000);
    expect(indexes).toHaveLength(1000);
    expect(indexes[indexes.length - 1]).toBe(999);
  });

  it("applies all-pages SafeLayer beyond SafeLayer and Large PDF preview limits", () => {
    const safeLayer = { ...createLayerForType("safelayer"), id: "safe-layer" };
    const plan = buildFlattenedExportPlan([safeLayer], 1000);

    expect(SAFELAYER_PREVIEW_PAGE_LIMIT).toBe(3);
    expect(plan[SAFELAYER_PREVIEW_PAGE_LIMIT].layerIds).toContain("safe-layer");
    expect(plan[199].layerIds).toContain("safe-layer");
    expect(plan[999].layerIds).toContain("safe-layer");
  });

  it("keeps page rules active beyond the large-PDF preview cap", () => {
    const textLayer = {
      ...createLayerForType("text"),
      id: "text-200",
      pages: { mode: "range" as const, selection: "200" },
    };
    const plan = buildFlattenedExportPlan([textLayer], 1000);

    expect(plan[198].layerIds).not.toContain("text-200");
    expect(plan[199].layerIds).toContain("text-200");
    expect(plan[200].layerIds).not.toContain("text-200");
  });

  it("keeps blackout layers in the rasterized page plan", () => {
    const blackout = {
      ...createLayerForType("blackout"),
      id: "blackout",
      blackoutRects: [{ id: "rect-1", page: 200, x: 10, y: 10, width: 40, height: 20 }],
    };
    const plan = buildFlattenedExportPlan([blackout], 1000);

    expect(plan[199].layerIds).toContain("blackout");
  });
});
