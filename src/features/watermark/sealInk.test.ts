import { describe, expect, it } from "vitest";
import {
  createDeterministicNoise,
  getSealInkProfile,
  getSealInkSegments,
  getSealSeed,
} from "./sealInk";

describe("seal ink helpers", () => {
  it("produces deterministic noise for the same seed", () => {
    const first = createDeterministicNoise("layer|reviewed|control");
    const second = createDeterministicNoise("layer|reviewed|control");

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it("uses different stable seeds for different seal content", () => {
    const first = getSealInkSegments(
      "real-ink",
      getSealSeed({ id: "a", title: "REVIEWED", subtitle: "DOCUMENT CONTROL" }),
    );
    const second = getSealInkSegments(
      "real-ink",
      getSealSeed({ id: "b", title: "APPROVED", subtitle: "DOCUMENT CONTROL" }),
    );

    expect(first).not.toEqual(second);
  });

  it("keeps segment values within safe readable ranges", () => {
    const segments = getSealInkSegments("faded-ink", "stable-seed");

    expect(segments.length).toBeGreaterThan(0);
    for (const segment of segments) {
      expect(segment.startRatio).toBeGreaterThanOrEqual(0);
      expect(segment.endRatio).toBeLessThanOrEqual(1);
      expect(segment.endRatio).toBeGreaterThan(segment.startRatio);
      expect(segment.opacity).toBeGreaterThan(0.4);
      expect(segment.opacity).toBeLessThanOrEqual(0.7);
    }
  });

  it("makes faded ink lighter and more broken than real ink", () => {
    const realInk = getSealInkProfile("real-ink");
    const fadedInk = getSealInkProfile("faded-ink");

    expect(fadedInk.textOpacity).toBeLessThan(realInk.textOpacity);
    expect(fadedInk.borderOpacity).toBeLessThan(realInk.borderOpacity);
    expect(fadedInk.gapRatio).toBeGreaterThan(realInk.gapRatio);
  });
});
