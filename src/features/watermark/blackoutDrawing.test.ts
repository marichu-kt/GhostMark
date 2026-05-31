import { describe, expect, it } from "vitest";
import { createBlackoutRectFromDrag } from "./blackoutDrawing";

describe("createBlackoutRectFromDrag", () => {
  it("creates a PDF-coordinate rectangle from a preview drag", () => {
    expect(
      createBlackoutRectFromDrag({
        id: "rect-1",
        page: 3,
        start: { x: 100, y: 120 },
        end: { x: 260, y: 180 },
        zoom: 2,
        pageHeight: 800,
      }),
    ).toEqual({
      id: "rect-1",
      page: 3,
      x: 50,
      y: 310,
      width: 80,
      height: 30,
    });
  });

  it("normalizes reverse drag direction", () => {
    const rect = createBlackoutRectFromDrag({
      id: "rect-2",
      page: 1,
      start: { x: 260, y: 180 },
      end: { x: 100, y: 120 },
      zoom: 2,
      pageHeight: 800,
    });

    expect(rect.x).toBe(50);
    expect(rect.y).toBe(310);
    expect(rect.width).toBe(80);
    expect(rect.height).toBe(30);
  });
});
