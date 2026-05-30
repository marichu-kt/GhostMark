import { describe, expect, it } from "vitest";
import type { PositionPreset } from "../../types/watermark";
import { resolveWatermarkPosition } from "./positioning";

const expectedPositions: Array<[PositionPreset, { x: number; y: number }]> = [
  ["top-left", { x: 10, y: 70 }],
  ["top-center", { x: 45, y: 70 }],
  ["top-right", { x: 80, y: 70 }],
  ["center-left", { x: 10, y: 40 }],
  ["center", { x: 45, y: 40 }],
  ["center-right", { x: 80, y: 40 }],
  ["bottom-left", { x: 10, y: 10 }],
  ["bottom-center", { x: 45, y: 10 }],
  ["bottom-right", { x: 80, y: 10 }],
];

describe("resolveWatermarkPosition", () => {
  it("maps the 3x3 picker positions to existing PDF coordinates", () => {
    for (const [preset, expected] of expectedPositions) {
      expect(
        resolveWatermarkPosition({
          preset,
          pageWidth: 100,
          pageHeight: 100,
          elementWidth: 10,
          elementHeight: 20,
          customX: 0,
          customY: 0,
          margin: 10,
        }),
      ).toEqual(expected);
    }
  });
});
