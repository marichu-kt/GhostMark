import { describe, expect, it } from "vitest";
import { cleanSafeLayerText, createSafeLayerRenderModel, type SafeLayerRendererConfig } from "./safelayerRenderer";

const baseConfig: SafeLayerRendererConfig = {
  seed: "case-001",
  text: "PROTECTED",
  style: "mixed",
  distortion: "medium",
  width: 612,
  height: 792,
  opacity: 0.22,
  rotation: -10,
  textSpacing: 116,
  lineSpacing: 62,
  waveStrength: 28,
  contourStrength: 22,
  holographicIntensity: 0.32,
};

describe("createSafeLayerRenderModel", () => {
  it("is deterministic for the same config", () => {
    expect(createSafeLayerRenderModel(baseConfig)).toEqual(createSafeLayerRenderModel(baseConfig));
  });

  it("uses user-defined text and a neutral empty default", () => {
    expect(cleanSafeLayerText("  internal   review ")).toBe("INTERNAL REVIEW");
    expect(cleanSafeLayerText("")).toBe("PROTECTED");
  });

  it("builds dense full-page wavy textPath rows", () => {
    const model = createSafeLayerRenderModel(baseConfig);

    expect(model.textRows.length).toBeGreaterThan(180);
    expect(model.textRows[0].path).toContain(" C");
    expect(model.textRows[0].path).toContain(" S");
    expect(model.textRows[0].text).toContain("PROTECTED");
    expect(model.textTransform).toContain("rotate");
  });

  it("generates contour/isoline segments across the page", () => {
    const model = createSafeLayerRenderModel(baseConfig);
    const xs = model.contourSegments.flatMap((segment) => [segment.start.x, segment.end.x]);
    const ys = model.contourSegments.flatMap((segment) => [segment.start.y, segment.end.y]);

    expect(model.contourSegments.length).toBeGreaterThan(1500);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(baseConfig.width);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(baseConfig.height);
  });

  it("does not emit demo placeholder, footer, website, or version text", () => {
    const model = createSafeLayerRenderModel({ ...baseConfig, text: "" });
    const generatedText = model.textRows.map((row) => row.text.toLowerCase()).join(" ");
    const forbidden = [`text ${"here"}`, `saferlayer${"."}com`, `v1${"."}6${"."}2`, "protege tus documentos"];

    for (const text of forbidden) {
      expect(generatedText).not.toContain(text);
    }

    expect(generatedText).toContain("protected");
  });
});
