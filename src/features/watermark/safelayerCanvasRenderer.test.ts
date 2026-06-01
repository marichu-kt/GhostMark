import { createCanvas } from "canvas";
import { describe, expect, it } from "vitest";
import { createLayerForType } from "./defaults";
import { drawSafeLayerToCanvas } from "./safelayerCanvasRenderer";
import {
  createSafeLayerRenderModel,
  SAFELAYER_FONT_SIZE,
  SAFELAYER_TEXT_SEPARATOR,
} from "./safelayerRenderer";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "test-id" } as unknown as Crypto,
    configurable: true,
  });
}

describe("drawSafeLayerToCanvas", () => {
  it("uses the same render model as preview/export SafeLayer planning", () => {
    const layer = {
      ...createLayerForType("safelayer"),
      id: "safe-layer-shared",
      text: "internal review",
      color: "#c62828",
      safeLayerSeed: "shared-seed",
    };
    const canvas = createCanvas(420, 560) as unknown as HTMLCanvasElement;
    const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    const renderedModel = drawSafeLayerToCanvas({
      context,
      canvas,
      layer,
      pageNumber: 1,
      quality: "preview",
    });
    const plannedModel = createSafeLayerRenderModel({
      seed: `${layer.safeLayerSeed}|${layer.id}`,
      text: layer.text,
      pageNumber: 1,
      width: canvas.width,
      height: canvas.height,
      quality: "preview",
    });
    const yValues = [...renderedModel.textRows[0].path.matchAll(/L\d+ ([\d.-]+)/g)].map((match) => match[1]);

    expect(renderedModel).toEqual(plannedModel);
    expect(renderedModel.fontSize).toBe(SAFELAYER_FONT_SIZE);
    expect(renderedModel.textRows[0].text).toContain(SAFELAYER_TEXT_SEPARATOR);
    expect(new Set(yValues.slice(0, 24)).size).toBeGreaterThan(6);
  });

  it("draws visible SafeLayer contours and wavy text onto the preview canvas", () => {
    const layer = {
      ...createLayerForType("safelayer"),
      id: "safe-layer-visible",
      text: "protected",
      color: "#c62828",
      safeLayerSeed: "visible-seed",
    };
    const canvas = createCanvas(360, 480) as unknown as HTMLCanvasElement;
    const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

    drawSafeLayerToCanvas({
      context,
      canvas,
      layer,
      pageNumber: 1,
      quality: "preview",
    });

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonTransparentPixels = 0;

    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] > 0) {
        nonTransparentPixels += 1;
      }
    }

    expect(nonTransparentPixels).toBeGreaterThan(200);
  });
});
