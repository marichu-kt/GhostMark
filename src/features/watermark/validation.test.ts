import { describe, expect, it } from "vitest";
import type { LoadedPdf } from "../../types/pdf";
import type { WatermarkConfig } from "../../types/watermark";
import {
  getAffectedPagesSummary,
  getDocumentAffectedPagesSummary,
  getLayersSummary,
  getWatermarkSummary,
  validateDocumentLayers,
  validateWatermarkConfig,
} from "./validation";

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
    name: "Text",
    enabled: true,
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
    redactionRectangles: [],
    redactionSearchText: "",
    redactionCaseSensitive: false,
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

  it("requires at least one redaction rectangle for redaction layers", () => {
    expect(validateWatermarkConfig(makeConfig({ type: "redaction", redactionRectangles: [] }), loadedPdf)).toEqual({
      isValid: false,
      messageKey: "validation.addRedactionRectangle",
    });
  });
});

describe("validateDocumentLayers", () => {
  it("requires an enabled layer", () => {
    expect(validateDocumentLayers([makeConfig({ enabled: false })], loadedPdf)).toEqual({
      isValid: false,
      messageKey: "validation.addLayer",
    });
  });

  it("accepts multiple valid enabled layers", () => {
    expect(
      validateDocumentLayers(
        [
          makeConfig({ id: "text-layer" }),
          makeConfig({
            id: "redaction-layer",
            type: "redaction",
            redactionRectangles: [{ id: "box-1", page: 1, x: 72, y: 640, width: 120, height: 32 }],
          }),
        ],
        loadedPdf,
      ),
    ).toEqual({ isValid: true });
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

  it("summarizes enabled document layers", () => {
    expect(getLayersSummary([makeConfig(), makeConfig({ id: "disabled", enabled: false })])).toBe(
      "Text: CONFIDENTIAL",
    );
    expect(getLayersSummary([makeConfig(), makeConfig({ id: "seal", type: "seal" })])).toBe("2 layers");
  });

  it("summarizes affected pages across layers", () => {
    expect(
      getDocumentAffectedPagesSummary(
        [
          makeConfig({ pages: { mode: "specific", selection: "1, 3" } }),
          makeConfig({ id: "second", pages: { mode: "specific", selection: "3, 5" } }),
        ],
        6,
      ),
    ).toBe("3 pages");
  });
});
