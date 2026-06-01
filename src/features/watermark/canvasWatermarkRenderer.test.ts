import { createCanvas } from "canvas";
import { describe, expect, it } from "vitest";
import { createLayerForType } from "./defaults";
import {
  drawImageWatermarkToCanvas,
  drawSealWatermarkToCanvas,
  getCanvasImageDimensions,
} from "./canvasWatermarkRenderer";
import { createImageRenderPlan, createSealRenderPlan } from "./layerGeometry";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "test-id" } as unknown as Crypto,
    configurable: true,
  });
}

describe("canvas watermark renderer parity", () => {
  it("returns the same image plan for preview-scale and export-scale canvas drawing", () => {
    const layer = {
      ...createLayerForType("image"),
      positionPreset: "bottom-right" as const,
      scale: 0.24,
      rotation: 31,
      opacity: 0.42,
    };
    const source = createCanvas(1000, 500);
    const previewCanvas = createCanvas(306, 396);
    const exportCanvas = createCanvas(1224, 1584);
    const previewPlan = drawImageWatermarkToCanvas({
      context: previewCanvas.getContext("2d") as unknown as CanvasRenderingContext2D,
      layer,
      image: source,
      pageWidth: 612,
      pageHeight: 792,
      canvasWidth: previewCanvas.width,
      canvasHeight: previewCanvas.height,
      scaleX: 0.5,
      scaleY: 0.5,
    });
    const exportPlan = drawImageWatermarkToCanvas({
      context: exportCanvas.getContext("2d") as unknown as CanvasRenderingContext2D,
      layer,
      image: source,
      pageWidth: 612,
      pageHeight: 792,
      canvasWidth: exportCanvas.width,
      canvasHeight: exportCanvas.height,
      scaleX: 2,
      scaleY: 2,
    });

    expect(getCanvasImageDimensions(source)).toEqual({ width: 1000, height: 500 });
    expect(previewPlan).toEqual(exportPlan);
    expect(previewPlan).toEqual(
      createImageRenderPlan({
        layer,
        pageWidth: 612,
        pageHeight: 792,
        sourceWidth: 1000,
        sourceHeight: 500,
      }),
    );
    expect(previewPlan.width / previewPlan.height).toBeCloseTo(2);
    expect(previewPlan.rotationOrigin).toBe("center");
  });

  it("returns the same seal plan for preview-scale and export-scale canvas drawing", () => {
    const layer = {
      ...createLayerForType("seal"),
      positionPreset: "center" as const,
      sealTitle: "verified",
      sealSubtitle: "document control",
      sealDocumentId: "case-9",
      sealShowDate: true,
      scale: 1.15,
      rotation: -12,
      color: "#7d3432",
      opacity: 0.72,
    };
    const previewCanvas = createCanvas(306, 396);
    const exportCanvas = createCanvas(1224, 1584);
    const previewPlan = drawSealWatermarkToCanvas({
      context: previewCanvas.getContext("2d") as unknown as CanvasRenderingContext2D,
      layer,
      pageWidth: 612,
      pageHeight: 792,
      canvasWidth: previewCanvas.width,
      canvasHeight: previewCanvas.height,
      scaleX: 0.5,
      scaleY: 0.5,
      dateText: "2026-06-01",
    });
    const exportPlan = drawSealWatermarkToCanvas({
      context: exportCanvas.getContext("2d") as unknown as CanvasRenderingContext2D,
      layer,
      pageWidth: 612,
      pageHeight: 792,
      canvasWidth: exportCanvas.width,
      canvasHeight: exportCanvas.height,
      scaleX: 2,
      scaleY: 2,
      dateText: "2026-06-01",
    });

    expect(previewPlan).toEqual(exportPlan);
    expect(previewPlan).toEqual(
      createSealRenderPlan({
        layer,
        pageWidth: 612,
        pageHeight: 792,
        dateText: "2026-06-01",
      }),
    );
    expect(previewPlan.title).toBe("VERIFIED");
    expect(previewPlan.documentId).toBe("CASE-9");
    expect(previewPlan.rotationOrigin).toBe("center");
    expect(previewPlan.titleY).toBeGreaterThan(previewPlan.dividerTop);
    expect(previewPlan.dateY).toBeGreaterThan(previewPlan.documentIdY);
  });
});
