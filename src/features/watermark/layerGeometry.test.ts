import { describe, expect, it } from "vitest";
import { createLayerForType } from "./defaults";
import {
  createImageRenderPlan,
  createSealRenderPlan,
  estimateLayerTextWidth,
  getImageLayerSize,
  getPatternTextSize,
  getSealLayerSize,
  getTextLayerSize,
  resolveLayerPlacement,
} from "./layerGeometry";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "test-id" } as unknown as Crypto,
    configurable: true,
  });
}

describe("shared layer geometry", () => {
  it("resolves preset placement from the same PDF coordinate model preview and export consume", () => {
    const layer = { ...createLayerForType("text"), positionPreset: "bottom-right" as const };
    const size = getTextLayerSize(layer);
    const placement = resolveLayerPlacement({
      layer,
      pageWidth: 612,
      pageHeight: 792,
      elementWidth: size.width,
      elementHeight: size.height,
    });

    expect(placement.x).toBe(612 - 48 - size.width);
    expect(placement.y).toBe(48);
    expect(placement.top).toBe(792 - 48 - size.height);
    expect(placement.centerX).toBe(placement.x + size.width / 2);
  });

  it("keeps custom coordinates as PDF bottom-left coordinates and exposes top-left canvas coordinates", () => {
    const layer = { ...createLayerForType("seal"), x: 72, y: 96, rotation: 12 };
    const size = getSealLayerSize(layer);
    const placement = resolveLayerPlacement({
      layer,
      pageWidth: 612,
      pageHeight: 792,
      elementWidth: size.width,
      elementHeight: size.height,
    });

    expect(placement.x).toBe(72);
    expect(placement.y).toBe(96);
    expect(placement.top).toBe(792 - 96 - size.height);
    expect(placement.rotation).toBe(12);
  });

  it("uses shared deterministic sizes for text, pattern, seal, and image layers", () => {
    const text = { ...createLayerForType("text"), text: "CONFIDENTIAL", fontSize: 64 };
    const pattern = { ...createLayerForType("pattern"), text: "DRAFT", fontSize: 28 };
    const seal = createLayerForType("seal");
    const image = { ...createLayerForType("image"), scale: 0.5 };

    expect(getTextLayerSize(text)).toEqual({ width: estimateLayerTextWidth("CONFIDENTIAL", 64), height: 64 });
    expect(getPatternTextSize(pattern)).toEqual({ width: estimateLayerTextWidth("DRAFT", 28), height: 28 });
    expect(getSealLayerSize(seal)).toEqual({ width: 236, height: 108 });
    expect(getImageLayerSize(image)).toEqual({ width: 130, height: 130 });
  });

  it("preserves image aspect ratio when minimum dimensions clamp small watermarks", () => {
    const landscape = { ...createLayerForType("image"), scale: 0.05 };
    const portrait = { ...createLayerForType("image"), scale: 0.05 };
    const square = { ...createLayerForType("image"), scale: 0.05 };

    expect(getImageLayerSize(landscape, 800, 400)).toEqual({ width: 96, height: 48 });
    expect(getImageLayerSize(portrait, 400, 800)).toEqual({ width: 48, height: 96 });
    expect(getImageLayerSize(square, 600, 600)).toEqual({ width: 48, height: 48 });
  });

  it("creates image render plans from natural dimensions without independent stretching", () => {
    const layer = { ...createLayerForType("image"), positionPreset: "top-left" as const, scale: 0.25, rotation: 18 };
    const plan = createImageRenderPlan({
      layer,
      pageWidth: 612,
      pageHeight: 792,
      sourceWidth: 1200,
      sourceHeight: 600,
    });

    expect(plan.width / plan.height).toBeCloseTo(2);
    expect(plan.aspectRatio).toBeCloseTo(2);
    expect(plan.rotation).toBe(18);
    expect(plan.rotationOrigin).toBe("center");
    expect(plan.anchor).toBe("center");
    expect(plan.x).toBe(48);
    expect(plan.top).toBe(48);
  });

  it("creates one seal render plan for preview and export drawing", () => {
    const layer = {
      ...createLayerForType("seal"),
      positionPreset: "bottom-right" as const,
      sealTitle: "approved",
      sealSubtitle: "document control",
      sealDocumentId: "doc-7",
      sealShowDate: true,
      rotation: -10,
    };
    const plan = createSealRenderPlan({
      layer,
      pageWidth: 612,
      pageHeight: 792,
      dateText: "2026-06-01",
    });

    expect(plan.title).toBe("APPROVED");
    expect(plan.subtitle).toBe("DOCUMENT CONTROL");
    expect(plan.documentId).toBe("DOC-7");
    expect(plan.dateText).toBe("2026-06-01");
    expect(plan.rotation).toBe(-10);
    expect(plan.rotationOrigin).toBe("center");
    expect(plan.anchor).toBe("center");
    expect(plan.borderWidth).toBe(2);
    expect(plan.x).toBe(612 - 48 - plan.width);
    expect(plan.y).toBe(48);
    expect(plan.top).toBe(792 - 48 - plan.height);
  });

  it("keeps rectangular seal typography inside the stamp bands", () => {
    const layer = {
      ...createLayerForType("seal"),
      sealDocumentId: "doc-7",
      sealShowDate: true,
    };
    const plan = createSealRenderPlan({
      layer,
      pageWidth: 612,
      pageHeight: 792,
      dateText: "2026-06-01",
    });

    expect(plan.innerInset).toBeGreaterThan(0);
    expect(plan.dividerTop).toBeGreaterThan(plan.innerInset);
    expect(plan.titleY).toBeGreaterThan(plan.dividerTop);
    expect(plan.subtitleY).toBeGreaterThan(plan.titleY);
    expect(plan.documentIdY).toBeGreaterThan(plan.subtitleY);
    expect(plan.dateY).toBeGreaterThan(plan.documentIdY);
    expect(plan.dateY).toBeLessThan(plan.height - plan.innerInset);
  });

  it("keeps circular seal geometry balanced within the stamp", () => {
    const layer = {
      ...createLayerForType("seal"),
      sealStyle: "circular" as const,
      sealDocumentId: "case-9",
      sealShowDate: true,
    };
    const plan = createSealRenderPlan({
      layer,
      pageWidth: 612,
      pageHeight: 792,
      dateText: "2026-06-01",
    });

    expect(plan.width).toBe(plan.height);
    expect(plan.circular).toBe(true);
    expect(plan.innerInset).toBeGreaterThan(plan.borderWidth);
    expect(plan.titleY).toBeGreaterThan(plan.dividerTop);
    expect(plan.subtitleY).toBeGreaterThan(plan.titleY);
    expect(plan.dateY).toBeLessThan(plan.height - plan.innerInset);
  });

  it("keeps seal placement stable at top-left, center, and bottom-right", () => {
    const base = { ...createLayerForType("seal"), sealShowDate: false };
    const topLeft = createSealRenderPlan({
      layer: { ...base, positionPreset: "top-left" },
      pageWidth: 612,
      pageHeight: 792,
    });
    const center = createSealRenderPlan({
      layer: { ...base, positionPreset: "center" },
      pageWidth: 612,
      pageHeight: 792,
    });
    const bottomRight = createSealRenderPlan({
      layer: { ...base, positionPreset: "bottom-right" },
      pageWidth: 612,
      pageHeight: 792,
    });

    expect(topLeft.x).toBe(48);
    expect(topLeft.top).toBe(48);
    expect(center.centerX).toBeCloseTo(306);
    expect(center.centerY).toBeCloseTo(396);
    expect(bottomRight.x).toBe(612 - 48 - bottomRight.width);
    expect(bottomRight.y).toBe(48);
  });
});
