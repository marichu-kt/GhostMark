import { describe, expect, it } from "vitest";
import { createSafeLayerPattern, type SafeLayerPatternConfig } from "./safelayerPattern";

const baseConfig: SafeLayerPatternConfig = {
  seed: "case-001",
  text: "PROTECTED",
  style: "mixed",
  distortion: "medium",
  width: 612,
  height: 792,
  opacity: 0.22,
  rotation: -10,
  textSpacing: 150,
  lineSpacing: 84,
  waveStrength: 18,
  contourStrength: 16,
  holographicIntensity: 0.32,
};

describe("createSafeLayerPattern", () => {
  it("is deterministic for the same config", () => {
    expect(createSafeLayerPattern(baseConfig)).toEqual(createSafeLayerPattern(baseConfig));
  });

  it("changes when seed or text changes", () => {
    expect(createSafeLayerPattern(baseConfig)).not.toEqual(
      createSafeLayerPattern({ ...baseConfig, seed: "case-002", text: "DIFFERENT" }),
    );
  });

  it("changes coordinates when wave strength changes", () => {
    const soft = createSafeLayerPattern({ ...baseConfig, waveStrength: 8 });
    const strong = createSafeLayerPattern({ ...baseConfig, waveStrength: 44 });

    expect(strong.textMarks.map((mark) => mark.y)).not.toEqual(soft.textMarks.map((mark) => mark.y));
  });

  it("uses holographic intensity for overlay generation", () => {
    const none = createSafeLayerPattern({ ...baseConfig, holographicIntensity: 0 });
    const visible = createSafeLayerPattern({ ...baseConfig, holographicIntensity: 0.6 });

    expect(none.holographicLines).toHaveLength(0);
    expect(visible.holographicLines.length).toBeGreaterThan(0);
  });

  it("keeps generated opacities in safe bounds", () => {
    const pattern = createSafeLayerPattern({ ...baseConfig, opacity: 1 });
    const opacities = [
      ...pattern.textMarks.map((mark) => mark.opacity),
      ...pattern.waveLines.map((line) => line.opacity),
      ...pattern.contourLines.map((line) => line.opacity),
      ...pattern.holographicLines.map((line) => line.opacity),
    ];

    expect(opacities.every((opacity) => opacity >= 0.025 && opacity <= 0.4)).toBe(true);
  });

  it("covers the full page with repeated text marks", () => {
    const pattern = createSafeLayerPattern(baseConfig);
    const xs = pattern.textMarks.map((mark) => mark.x);
    const ys = pattern.textMarks.map((mark) => mark.y);

    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(baseConfig.width);
    expect(Math.min(...ys)).toBeLessThan(0);
    expect(Math.max(...ys)).toBeGreaterThan(baseConfig.height);
  });

  it("does not emit demo placeholder or footer text when layer text is empty", () => {
    const pattern = createSafeLayerPattern({ ...baseConfig, text: "" });
    const generatedText = pattern.textMarks.map((mark) => mark.text.toLowerCase()).join(" ");
    const forbidden = [`text ${"here"}`, `saferlayer${"."}com`, `v1${"."}6${"."}2`];

    for (const text of forbidden) {
      expect(generatedText).not.toContain(text);
    }

    expect(generatedText).toContain("protected");
  });
});
