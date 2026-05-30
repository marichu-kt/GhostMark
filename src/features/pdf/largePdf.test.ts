import { describe, expect, it } from "vitest";
import {
  clampPreviewPage,
  getVisiblePageCount,
  isPageVisibleInPreview,
  shouldUseLargePdfMode,
} from "./largePdf";

describe("large PDF preview helpers", () => {
  it("enables Large PDF Mode only above the threshold", () => {
    expect(shouldUseLargePdfMode(150)).toBe(false);
    expect(shouldUseLargePdfMode(151)).toBe(true);
  });

  it("limits visible pages to the preview cap", () => {
    expect(getVisiblePageCount(100)).toBe(100);
    expect(getVisiblePageCount(150)).toBe(150);
    expect(getVisiblePageCount(151)).toBe(150);
    expect(getVisiblePageCount(1000)).toBe(150);
  });

  it("checks whether one-based page numbers are visible in preview", () => {
    expect(isPageVisibleInPreview(150, 1000)).toBe(true);
    expect(isPageVisibleInPreview(151, 1000)).toBe(false);
    expect(isPageVisibleInPreview(151, 151)).toBe(false);
    expect(isPageVisibleInPreview(0, 1000)).toBe(false);
    expect(isPageVisibleInPreview(1001, 1000)).toBe(false);
  });

  it("clamps preview navigation to the visible page range", () => {
    expect(clampPreviewPage(999, 1000)).toBe(150);
    expect(clampPreviewPage(-4, 1000)).toBe(1);
    expect(clampPreviewPage(90, 120)).toBe(90);
  });
});
