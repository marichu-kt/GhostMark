import { describe, expect, it } from "vitest";
import {
  SAFELAYER_FONT_SIZE,
  SAFELAYER_TEXT_SEPARATOR,
  cleanSafeLayerText,
  createSafeLayerRenderModel,
  type SafeLayerRendererConfig,
} from "./safelayerRenderer";

const baseConfig: SafeLayerRendererConfig = {
  seed: "case-001",
  text: "PROTECTED",
  pageNumber: 1,
  width: 612,
  height: 792,
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
    const yValues = [...model.textRows[0].path.matchAll(/L\d+ ([\d.-]+)/g)].map((match) => match[1]);

    expect(model.textRows.length).toBeGreaterThan(180);
    expect(model.textRows[0].path).toContain(" L");
    expect(new Set(yValues.slice(0, 24)).size).toBeGreaterThan(6);
    expect(model.textRows[0].text).toContain("PROTECTED");
    expect(model.textTransform).toContain("rotate");
  });

  it("uses the diamond separator and never inserts the old middle-dot separator", () => {
    const model = createSafeLayerRenderModel({ ...baseConfig, text: "Confidential" });
    const generatedText = model.textRows.map((row) => row.text).join(" ");

    expect(generatedText).toContain(`CONFIDENTIAL ${SAFELAYER_TEXT_SEPARATOR} CONFIDENTIAL`);
    expect(generatedText).not.toContain("CONFIDENTIAL · CONFIDENTIAL");
  });

  it("keeps SafeLayer text at the fixed 7px renderer size", () => {
    expect(createSafeLayerRenderModel(baseConfig).fontSize).toBe(SAFELAYER_FONT_SIZE);
    expect(SAFELAYER_FONT_SIZE).toBe(7);
  });

  it("varies deterministic rotation and curves by page", () => {
    const pageOne = createSafeLayerRenderModel({ ...baseConfig, pageNumber: 1 });
    const pageTwo = createSafeLayerRenderModel({ ...baseConfig, pageNumber: 2 });

    expect(pageOne).toEqual(createSafeLayerRenderModel({ ...baseConfig, pageNumber: 1 }));
    expect(pageOne.rotation).toBeGreaterThanOrEqual(-32);
    expect(pageOne.rotation).toBeLessThanOrEqual(-24);
    expect(pageTwo.rotation).toBeGreaterThanOrEqual(-32);
    expect(pageTwo.rotation).toBeLessThanOrEqual(-24);
    expect(pageOne.rotation).not.toBe(pageTwo.rotation);
    expect(pageOne.textRows[0].path).not.toBe(pageTwo.textRows[0].path);
    expect(pageOne.contourSegments.slice(0, 12)).not.toEqual(pageTwo.contourSegments.slice(0, 12));
  });

  it("uses the same page seed across preview and export dimensions", () => {
    const preview = createSafeLayerRenderModel({ ...baseConfig, width: 306, height: 396, quality: "preview" });
    const exportModel = createSafeLayerRenderModel({ ...baseConfig, width: 612, height: 792, quality: "export" });

    expect(preview.rotation).toBe(exportModel.rotation);
    expect(preview.textRows[0].offsetRatio).toBe(exportModel.textRows[0].offsetRatio);
    expect(preview.textRows[0].opacity).toBe(exportModel.textRows[0].opacity);
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
