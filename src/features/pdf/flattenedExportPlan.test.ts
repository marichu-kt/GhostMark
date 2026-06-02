import { describe, expect, it } from "vitest";
import { createLayerForType } from "../watermark/defaults";
import { SAFELAYER_PREVIEW_PAGE_LIMIT } from "../watermark/safelayerRenderer";
import {
  DEFAULT_FLATTENED_EXPORT_QUALITY,
  FLATTENED_EXPORT_QUALITY_PRESETS,
  buildFlattenedExportPlan,
  getFlattenedExportPageIndexes,
  resolveFlattenedExportQuality,
} from "./flattenedExportPlan";
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

  it("uses compressed JPEG settings for the default flattened export", () => {
    const settings = resolveFlattenedExportQuality();

    expect(DEFAULT_FLATTENED_EXPORT_QUALITY).toBe("balanced");
    expect(settings.imageType).toBe("image/jpeg");
    expect(settings.imageQuality).toBe(0.76);
    expect(settings.renderScale).toBe(1.5);
    expect(settings.maxCanvasPixels).toBe(14_000_000);
  });

  it("keeps export quality presets capped and ordered by output intent", () => {
    const small = resolveFlattenedExportQuality("small");
    const balanced = resolveFlattenedExportQuality("balanced");
    const high = resolveFlattenedExportQuality("high");

    expect(Object.keys(FLATTENED_EXPORT_QUALITY_PRESETS)).toEqual(["small", "balanced", "high"]);
    expect(small.imageType).toBe("image/jpeg");
    expect(small.imageQuality).toBeLessThan(balanced.imageQuality);
    expect(balanced.imageQuality).toBeLessThan(high.imageQuality);
    expect(small.renderScale).toBeLessThan(balanced.renderScale);
    expect(balanced.renderScale).toBeLessThanOrEqual(high.renderScale);
    expect(small.maxCanvasPixels).toBeLessThan(balanced.maxCanvasPixels);
    expect(balanced.maxCanvasPixels).toBeLessThan(high.maxCanvasPixels);
  });
});
