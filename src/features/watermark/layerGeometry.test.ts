import { describe, expect, it } from "vitest";
import { createLayerForType } from "./defaults";
import {
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
    expect(getSealLayerSize(seal)).toEqual({ width: 220, height: 92 });
    expect(getImageLayerSize(image)).toEqual({ width: 130, height: 130 });
  });
});
