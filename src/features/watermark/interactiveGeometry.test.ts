import { describe, expect, it } from "vitest";
import { createLayerForType } from "./defaults";
import {
  createInteractiveLayerPlacement,
  moveInteractiveLayer,
  resizeInteractiveLayer,
} from "./interactiveGeometry";

Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: () => "test-layer-id",
  } as unknown as Crypto,
  configurable: true,
});

describe("interactive QR, barcode, and signature geometry", () => {
  it("moves a QR layer in PDF coordinates from preview deltas", () => {
    const layer = {
      ...createLayerForType("qr"),
      positionPreset: "bottom-right" as const,
      qrSize: 100,
    };
    const moved = moveInteractiveLayer({
      layer,
      deltaX: -40,
      deltaY: 20,
      pageWidth: 320,
      pageHeight: 180,
    });

    expect(moved).toMatchObject({
      positionPreset: "center",
      x: 132,
      y: 28,
    });
  });

  it("resizes QR, barcode, and signature layers through the shared helper", () => {
    expect(resizeInteractiveLayer({
      layer: createLayerForType("qr"),
      deltaX: 26,
      deltaY: 12,
      pageWidth: 320,
      pageHeight: 180,
    })).toMatchObject({ qrSize: 144 });

    expect(resizeInteractiveLayer({
      layer: createLayerForType("barcode"),
      deltaX: 40,
      deltaY: 18,
      pageWidth: 420,
      pageHeight: 260,
    })).toMatchObject({ barcodeWidth: 260, barcodeHeight: 90 });

    expect(resizeInteractiveLayer({
      layer: createLayerForType("signature"),
      deltaX: 35,
      deltaY: 10,
      pageWidth: 420,
      pageHeight: 260,
    })).toMatchObject({ signatureWidth: 255, signatureHeight: 96 });
  });

  it("uses the same placement helper for preview and export geometry", () => {
    const layer = {
      ...createLayerForType("barcode"),
      x: 30,
      y: 40,
      barcodeWidth: 180,
      barcodeHeight: 64,
    };

    expect(createInteractiveLayerPlacement({ layer, pageWidth: 320, pageHeight: 180 })).toMatchObject({
      x: 30,
      y: 40,
      top: 76,
      width: 180,
      height: 64,
    });
  });
});
