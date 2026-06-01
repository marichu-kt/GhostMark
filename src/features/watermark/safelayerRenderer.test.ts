import { describe, expect, it } from "vitest";
import {
  SAFELAYER_FONT_SIZE,
  SAFELAYER_PREVIEW_PAGE_LIMIT,
  SAFELAYER_TEXT_SEPARATOR,
  buildExactWavePath,
  cleanSafeLayerText,
  createSafeLayerRenderModel,
  getSafeLayerPageRotation,
  getSafeLayerPointAtDistance,
  sampleSafeLayerWavePath,
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

    expect(model.textRows.length).toBeGreaterThan(180);
    expect(model.textRows[0].path).toContain(" C22 0, 44 14, 66 7");
    expect(model.textRows[0].path).toContain(" S110 0, 132 7");
    expect(model.textRows[0].path).toContain(" S176 14, 198 7");
    expect(model.textRows[0].text).toContain("PROTECTED");
    expect(model.textTransform).toContain("rotate");
  });

  it("ports the reference cubic wave path instead of straight or polyline rows", () => {
    const path = buildExactWavePath(420, 21);

    expect(path.startsWith("M0 21 C22 14, 44 28, 66 21")).toBe(true);
    expect(path).toContain(" S110 14, 132 21");
    expect(path).toContain(" S176 28, 198 21");
    expect(path).not.toContain(" L");
  });

  it("samples the cubic wave with changing tangents for canvas text-on-path rendering", () => {
    const points = sampleSafeLayerWavePath(420, 21);
    const first = getSafeLayerPointAtDistance(points, 24);
    const later = getSafeLayerPointAtDistance(points, 72);

    expect(points.length).toBeGreaterThan(80);
    expect(first?.angle).not.toBe(later?.angle);
    expect(new Set(points.slice(0, 20).map((point) => point.y.toFixed(2))).size).toBeGreaterThan(6);
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
    expect(pageOne.rotation).toBeGreaterThanOrEqual(-45);
    expect(pageOne.rotation).toBeLessThanOrEqual(45);
    expect(pageTwo.rotation).toBeGreaterThanOrEqual(-45);
    expect(pageTwo.rotation).toBeLessThanOrEqual(45);
    expect(pageOne.rotation).not.toBe(pageTwo.rotation);
    expect(pageOne.textRows[0].startOffset).not.toBe(pageTwo.textRows[0].startOffset);
    expect(pageOne.contourSegments.slice(0, 12)).not.toEqual(pageTwo.contourSegments.slice(0, 12));
  });

  it("uses the same SafeLayer rotation calculation for preview and export render models", () => {
    const preview = createSafeLayerRenderModel({ ...baseConfig, quality: "preview" });
    const exportModel = createSafeLayerRenderModel({ ...baseConfig, width: 612, height: 792, quality: "export" });

    expect(preview.rotation).toBe(exportModel.rotation);
    expect(preview.textRows[0].offsetRatio).toBe(exportModel.textRows[0].offsetRatio);
    expect(preview.textRows[0].opacity).toBe(exportModel.textRows[0].opacity);
  });

  it("keeps page rotations deterministic across the requested -45 to 45 degree range", () => {
    const rotations = Array.from({ length: 18 }, (_, index) =>
      getSafeLayerPageRotation({ ...baseConfig, pageNumber: index + 1 }),
    );

    for (const rotation of rotations) {
      expect(rotation).toBeGreaterThanOrEqual(-45);
      expect(rotation).toBeLessThanOrEqual(45);
    }

    expect(new Set(rotations.map((rotation) => rotation.toFixed(2))).size).toBeGreaterThan(12);
    expect(rotations).toEqual(
      Array.from({ length: 18 }, (_, index) => getSafeLayerPageRotation({ ...baseConfig, pageNumber: index + 1 })),
    );
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

  it("keeps preview capped at three pages while render planning supports export pages", () => {
    const model = createSafeLayerRenderModel({ ...baseConfig, pageNumber: 8, quality: "export" });

    expect(SAFELAYER_PREVIEW_PAGE_LIMIT).toBe(3);
    expect(model.textRows.length).toBeGreaterThan(180);
  });
});
