import { describe, expect, it } from "vitest";
import { POSITION_GRID_OPTIONS } from "./PositionGridPicker";

describe("POSITION_GRID_OPTIONS", () => {
  it("contains exactly the nine grid positions in reading order", () => {
    expect(POSITION_GRID_OPTIONS.map((option) => option.value)).toEqual([
      "top-left",
      "top-center",
      "top-right",
      "center-left",
      "center",
      "center-right",
      "bottom-left",
      "bottom-center",
      "bottom-right",
    ]);
  });

  it("uses accessible label keys without visible cell content requirements", () => {
    expect(POSITION_GRID_OPTIONS.every((option) => option.labelKey.startsWith("position."))).toBe(true);
  });
});
