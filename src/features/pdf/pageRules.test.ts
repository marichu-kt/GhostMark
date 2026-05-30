import { describe, expect, it } from "vitest";
import { isPageVisibleInPreview } from "./largePdf";
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

  it("resolves all pages against the full document page count", () => {
    const pages = resolvePageRules({ mode: "all", selection: "" }, 1000);

    expect(pages).toHaveLength(1000);
    expect(pages[0]).toBe(0);
    expect(pages[999]).toBe(999);
  });

  it("accepts custom ranges outside the Large PDF Mode preview limit", () => {
    expect(resolvePageRules({ mode: "range", selection: "200-205" }, 1000)).toEqual([
      199, 200, 201, 202, 203, 204,
    ]);
  });

  it("keeps hidden preview pages valid for export rules", () => {
    expect(isPageVisibleInPreview(151, 1000)).toBe(false);
    expect(resolvePageRules({ mode: "specific", selection: "151" }, 1000)).toEqual([150]);
  });

  it("resolves odd and even pages against the full document page count", () => {
    const oddPages = resolvePageRules({ mode: "odd", selection: "" }, 1000);
    const evenPages = resolvePageRules({ mode: "even", selection: "" }, 1000);

    expect(oddPages).toHaveLength(500);
    expect(evenPages).toHaveLength(500);
    expect(oddPages[oddPages.length - 1]).toBe(998);
    expect(evenPages[evenPages.length - 1]).toBe(999);
  });

  it("resolves the last page against the full document page count", () => {
    expect(resolvePageRules({ mode: "last", selection: "" }, 1000)).toEqual([999]);
  });
});
