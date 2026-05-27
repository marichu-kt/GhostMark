import { describe, expect, it } from "vitest";
import type { LoadedPdf } from "../../types/pdf";
import type { WatermarkConfig } from "../../types/watermark";
import { getAffectedPagesSummary, getWatermarkSummary, validateWatermarkConfig } from "./validation";

const loadedPdf: LoadedPdf = {
  id: "test-pdf",
  fileName: "case-file.pdf",
  fileSize: 1024,
  pageCount: 6,
  bytes: new Uint8Array(),
  loadedAt: "2026-05-28T00:00:00.000Z",
};

function makeConfig(patch: Partial<WatermarkConfig> = {}): WatermarkConfig {
  return {
    id: "test-watermark",
    type: "text",
    text: "CONFIDENTIAL",
    fontSize: 64,
    color: "#2f343a",
    opacity: 0.18,
    rotation: 45,
    positionPreset: "center",
    x: 0,
    y: 0,
    scale: 0.35,
    pages: { mode: "all", selection: "" },
    layer: "above-content",
    patternSpacingX: 220,
    patternSpacingY: 160,
    patternStaggered: true,
    classificationTop: true,
    classificationBottom: true,
    classificationText: "CONFIDENTIAL",
    bannerEnabledTop: true,
    bannerEnabledBottom: true,
    bannerMargin: 18,
    sealTitle: "REVIEWED",
    sealSubtitle: "DOCUMENT CONTROL",
    sealShowDate: true,
    sealBorderThickness: 2,
    ...patch,
  };
}

describe("validateWatermarkConfig", () => {
  it("requires a PDF before export", () => {
    expect(validateWatermarkConfig(makeConfig(), null)).toEqual({
      isValid: false,
      messageKey: "validation.selectPdf",
    });
  });

  it("requires text for text watermarks", () => {
    const config = makeConfig({ text: "   " });
    expect(validateWatermarkConfig(config, loadedPdf)).toEqual({
      isValid: false,
      messageKey: "validation.addWatermarkText",
    });
  });

  it("requires an image for image watermarks", () => {
    const config = makeConfig({ type: "image" });
    expect(validateWatermarkConfig(config, loadedPdf)).toEqual({
      isValid: false,
      messageKey: "validation.uploadImage",
    });
  });

  it("accepts a valid default watermark", () => {
    expect(validateWatermarkConfig(makeConfig(), loadedPdf)).toEqual({
      isValid: true,
    });
  });
});

describe("watermark summaries", () => {
  it("summarizes a text watermark", () => {
    const config = makeConfig();
    expect(getWatermarkSummary(config)).toBe("Text: CONFIDENTIAL");
  });

  it("summarizes affected page counts", () => {
    const config = {
      ...makeConfig(),
      pages: { mode: "specific" as const, selection: "1, 3, 5" },
    };
    expect(getAffectedPagesSummary(config, 6)).toBe("3 pages");
  });
});
