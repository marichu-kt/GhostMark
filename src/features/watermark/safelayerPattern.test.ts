import { describe, expect, it } from "vitest";
import { createSafeLayerPattern, type SafeLayerPatternConfig } from "./safelayerPattern";

const baseConfig: SafeLayerPatternConfig = {
  seed: "case-001",
  text: "ONLY VALID FOR REVIEW",
  style: "mixed",
  density: "medium",
  distortion: "medium",
  width: 612,
  height: 792,
  opacity: 0.22,
  textSpacing: 150,
  lineSpacing: 84,
  waveStrength: 18,
  contourStrength: 16,
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

  it("increases complexity for higher density", () => {
    const low = createSafeLayerPattern({ ...baseConfig, density: "low" });
    const high = createSafeLayerPattern({ ...baseConfig, density: "high" });

    expect(high.textMarks.length + high.waveLines.length + high.contourLines.length).toBeGreaterThan(
      low.textMarks.length + low.waveLines.length + low.contourLines.length,
    );
  });

  it("keeps generated opacities in safe bounds", () => {
    const pattern = createSafeLayerPattern({ ...baseConfig, opacity: 1 });
    const opacities = [
      ...pattern.textMarks.map((mark) => mark.opacity),
      ...pattern.waveLines.map((line) => line.opacity),
      ...pattern.contourLines.map((line) => line.opacity),
    ];

    expect(opacities.every((opacity) => opacity >= 0.04 && opacity <= 0.42)).toBe(true);
  });
});
