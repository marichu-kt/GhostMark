import { describe, expect, it } from "vitest";
import { parsePageSelection, resolvePageRules } from "./pageRules";

describe("parsePageSelection", () => {
  it("parses a single page as a zero-based index", () => {
    expect(parsePageSelection("3", 10)).toEqual([2]);
  });

  it("parses multiple pages", () => {
    expect(parsePageSelection("1, 4, 7", 10)).toEqual([0, 3, 6]);
  });

  it("parses ranges", () => {
    expect(parsePageSelection("2-5", 10)).toEqual([1, 2, 3, 4]);
  });

  it("parses mixed syntax", () => {
    expect(parsePageSelection("1, 3, 5-7, 10", 12)).toEqual([0, 2, 4, 5, 6, 9]);
  });

  it("rejects invalid values", () => {
    expect(() => parsePageSelection("1, x", 10)).toThrow("not a valid page number");
  });

  it("rejects out-of-bounds values", () => {
    expect(() => parsePageSelection("11", 10)).toThrow("outside the document range");
  });

  it("removes duplicates and sorts pages", () => {
    expect(parsePageSelection("5, 3, 3, 1-2, 2", 10)).toEqual([0, 1, 2, 4]);
  });

  it("rejects empty input", () => {
    expect(() => parsePageSelection("   ", 10)).toThrow("Enter at least one page");
  });
});

describe("resolvePageRules", () => {
  it("supports exclude pages", () => {
    expect(resolvePageRules({ mode: "exclude", selection: "2, 4" }, 5)).toEqual([0, 2, 4]);
  });
});
