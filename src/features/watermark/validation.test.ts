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
import { createLayerForType } from "./defaults";

if (!globalThis.crypto) {
  let randomId = 0;
  Object.defineProperty(globalThis, "crypto", {
    value: {
      randomUUID: () => `test-layer-${(randomId += 1)}`,
    } as Crypto,
  });
}

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
    sealTitle: "REVIEWED",
    sealSubtitle: "DOCUMENT CONTROL",
    sealDocumentId: "",
    sealStyle: "rectangular",
    sealShowDate: true,
    sealBorderThickness: 2,
    safeLayerStyle: "mixed",
    safeLayerDistortion: "medium",
    safeLayerSeed: "test-seed",
    safeLayerTextSpacing: 150,
    safeLayerLineSpacing: 84,
    safeLayerWaveStrength: 18,
    safeLayerContourStrength: 16,
    safeLayerHolographicIntensity: 0.32,
    blackoutRects: [],
    qrContent: "https://marichu-kt.github.io/GhostMark/",
    qrSize: 118,
    barcodeValue: "GHOSTMARK-001",
    barcodeFormat: "CODE128",
    barcodeWidth: 220,
    barcodeHeight: 72,
    signatureMode: "typed",
    signatureText: "Approved",
    signatureStyle: "classic",
    signatureWidth: 220,
    signatureHeight: 86,
    signatureStrokes: [],
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

  it("requires a blackout rectangle for blackout layers", () => {
    const config = makeConfig({ type: "blackout", blackoutRects: [] });
    expect(validateWatermarkConfig(config, loadedPdf)).toEqual({
      isValid: false,
      messageKey: "validation.addBlackoutRect",
    });
  });

  it("requires QR content for QR layers", () => {
    const config = makeConfig({ type: "qr", qrContent: "   " });
    expect(validateWatermarkConfig(config, loadedPdf)).toEqual({
      isValid: false,
      messageKey: "validation.addQrContent",
    });
  });

  it("requires a barcode value for barcode layers", () => {
    const config = makeConfig({ type: "barcode", barcodeValue: "   " });
    expect(validateWatermarkConfig(config, loadedPdf)).toEqual({
      isValid: false,
      messageKey: "validation.addBarcodeValue",
    });
  });

  it("requires typed signature text or drawn signature strokes for signature layers", () => {
    expect(
      validateWatermarkConfig(makeConfig({ type: "signature", signatureMode: "typed", signatureText: " " }), loadedPdf),
    ).toEqual({
      isValid: false,
      messageKey: "validation.addSignatureText",
    });
    expect(
      validateWatermarkConfig(
        makeConfig({ type: "signature", signatureMode: "drawn", signatureStrokes: [] }),
        loadedPdf,
      ),
    ).toEqual({
      isValid: false,
      messageKey: "validation.drawSignature",
    });
  });

  it("accepts a valid default watermark", () => {
    expect(validateWatermarkConfig(makeConfig(), loadedPdf)).toEqual({
      isValid: true,
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
          makeConfig({ id: "seal-layer", type: "seal" }),
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

describe("seal defaults", () => {
  it("creates a professional document-control seal", () => {
    const seal = createLayerForType("seal");

    expect(seal.sealTitle).toBe("REVIEWED");
    expect(seal.sealSubtitle).toBe("DOCUMENT CONTROL");
    expect(seal.sealStyle).toBe("rectangular");
    expect(seal.positionPreset).toBe("bottom-right");
    expect(seal.scale).toBe(1);
  });
});

describe("pattern defaults", () => {
  it("creates a large diagonal pattern watermark by default", () => {
    const pattern = createLayerForType("pattern");

    expect(pattern.fontSize).toBe(95);
    expect(pattern.opacity).toBe(0.12);
    expect(pattern.rotation).toBe(-26);
  });
});

describe("blackout defaults", () => {
  it("does not create an automatic rectangle", () => {
    expect(createLayerForType("blackout").blackoutRects).toEqual([]);
  });
});

describe("QR, barcode, and signature defaults", () => {
  it("creates local QR, Code 128 barcode, and typed signature defaults", () => {
    expect(createLayerForType("qr")).toMatchObject({
      type: "qr",
      qrContent: "https://marichu-kt.github.io/GhostMark/",
      qrSize: 118,
      positionPreset: "bottom-right",
    });
    expect(createLayerForType("barcode")).toMatchObject({
      type: "barcode",
      barcodeValue: "GHOSTMARK-001",
      barcodeFormat: "CODE128",
      barcodeWidth: 220,
      barcodeHeight: 72,
    });
    expect(createLayerForType("signature")).toMatchObject({
      type: "signature",
      signatureMode: "typed",
      signatureText: "Approved",
      signatureWidth: 220,
      signatureHeight: 86,
    });
  });
});
