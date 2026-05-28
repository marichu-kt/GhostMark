import { describe, expect, it } from "vitest";
import { findMatchRanges } from "./redactionText";

describe("findMatchRanges", () => {
  it("finds case-insensitive text matches", () => {
    expect(findMatchRanges("Case file CASE file", "case", false)).toEqual([
      [0, 4],
      [10, 14],
    ]);
  });

  it("respects case-sensitive matching", () => {
    expect(findMatchRanges("Case file CASE file", "case", true)).toEqual([]);
    expect(findMatchRanges("Case file CASE file", "CASE", true)).toEqual([[10, 14]]);
  });

  it("ignores empty search input", () => {
    expect(findMatchRanges("Case file", "   ", false)).toEqual([]);
  });
});
