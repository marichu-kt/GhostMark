import { describe, expect, it } from "vitest";
import { createLayerForType } from "./defaults";
import { createSafeLayerSvgMarkup } from "./safelayerSvgRenderer";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "test-id" } as unknown as Crypto,
    configurable: true,
  });
}

describe("createSafeLayerSvgMarkup", () => {
  it("emits real SVG textPath rows from the shared SafeLayer render model", () => {
    const layer = {
      ...createLayerForType("safelayer"),
      id: "svg-safe-layer",
      text: "internal review",
      color: "#c62828",
      safeLayerSeed: "svg-seed",
    };
    const { model, svg } = createSafeLayerSvgMarkup({
      layer,
      pageNumber: 1,
      width: 612,
      height: 792,
      quality: "preview",
    });

    expect(svg).toContain("<textPath");
    expect(svg).toContain("href=\"#safelayer-wave-");
    expect(svg).toContain("font-size=\"7\"");
    expect(svg).toContain("INTERNAL REVIEW ◆ INTERNAL REVIEW");
    expect(svg).toContain(" C22 0, 44 14, 66 7");
    expect(svg).toContain(" S110 0, 132 7");
    expect(svg).toContain(model.textTransform);
    expect(svg).not.toContain("TEXT HERE");
    expect(svg).not.toContain("saferlayer.com");
    expect(svg).not.toContain("v1.6.2");
  });

  it("is deterministic for the same layer, page, and page size", () => {
    const layer = { ...createLayerForType("safelayer"), id: "deterministic-svg", text: "protected" };
    const input = { layer, pageNumber: 2, width: 420, height: 560, quality: "export" as const };

    expect(createSafeLayerSvgMarkup(input)).toEqual(createSafeLayerSvgMarkup(input));
  });
});
