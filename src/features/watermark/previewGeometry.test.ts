import { describe, expect, it } from "vitest";
import { createLayerForType } from "./defaults";
import { resolveWatermarkPosition } from "./positioning";
import { resolvePreviewWatermarkPosition } from "./previewGeometry";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "test-id" } as unknown as Crypto,
    configurable: true,
  });
}

describe("resolvePreviewWatermarkPosition", () => {
  it("converts the shared PDF position helper into preview top-left coordinates", () => {
    const layer = {
      ...createLayerForType("text"),
      positionPreset: "top-right" as const,
      rotation: -35,
    };
    const pageWidth = 612;
    const pageHeight = 792;
    const elementWidth = 140;
    const elementHeight = 28;
    const pdfPosition = resolveWatermarkPosition({
      preset: layer.positionPreset,
      pageWidth,
      pageHeight,
      elementWidth,
      elementHeight,
      customX: 0,
      customY: 0,
      margin: 48,
    });

    expect(
      resolvePreviewWatermarkPosition({
        layer,
        pageWidth,
        pageHeight,
        elementWidth,
        elementHeight,
        zoom: 1,
        rotation: layer.rotation,
      }),
    ).toEqual({
      left: pdfPosition.x,
      top: pageHeight - pdfPosition.y - elementHeight,
      transform: "rotate(-35deg)",
    });
  });

  it("keeps custom PDF coordinates consistent in the preview overlay", () => {
    const layer = {
      ...createLayerForType("seal"),
      x: 72,
      y: 96,
      rotation: 12,
    };

    expect(
      resolvePreviewWatermarkPosition({
        layer,
        pageWidth: 612,
        pageHeight: 792,
        elementWidth: 180,
        elementHeight: 80,
        zoom: 1,
        rotation: layer.rotation,
      }),
    ).toEqual({
      left: 72,
      top: 616,
      transform: "rotate(12deg)",
    });
  });
});
