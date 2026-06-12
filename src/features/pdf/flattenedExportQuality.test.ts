import { describe, expect, it } from "vitest";
import {
  DEFAULT_FLATTENED_EXPORT_QUALITY,
  FLATTENED_EXPORT_QUALITY_PRESETS,
  resolveFlattenedExportQuality,
} from "./flattenedExportPlan";

describe("flattened export quality", () => {
  it("uses sharp image-based defaults for production export", () => {
    const settings = resolveFlattenedExportQuality();

    expect(DEFAULT_FLATTENED_EXPORT_QUALITY).toBe("balanced");
    expect(settings.imageType).toBe("image/jpeg");
    expect(settings.renderScale).toBeGreaterThanOrEqual(2);
    expect(settings.imageQuality).toBeGreaterThanOrEqual(0.88);
    expect(settings.maxCanvasPixels).toBeGreaterThanOrEqual(24_000_000);
    expect(settings.maxCanvasPixels).toBeLessThanOrEqual(32_000_000);
  });

  it("keeps the max pixel cap ordered by quality intent", () => {
    const small = FLATTENED_EXPORT_QUALITY_PRESETS.small;
    const balanced = FLATTENED_EXPORT_QUALITY_PRESETS.balanced;
    const high = FLATTENED_EXPORT_QUALITY_PRESETS.high;

    expect(small.maxCanvasPixels).toBeLessThan(balanced.maxCanvasPixels);
    expect(balanced.maxCanvasPixels).toBeLessThan(high.maxCanvasPixels);
    expect(high.maxCanvasPixels).toBeLessThanOrEqual(32_000_000);
  });
});
