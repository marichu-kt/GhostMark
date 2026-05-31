import { describe, expect, it } from "vitest";
import { SAFELAYER_VISIBLE_INSPECTOR_KEYS } from "./WatermarkDesigner";

describe("WatermarkDesigner SafeLayer controls", () => {
  it("documents the minimal SafeLayer inspector contract", () => {
    expect(SAFELAYER_VISIBLE_INSPECTOR_KEYS).toEqual([
      "safelayer.text",
      "watermark.color",
      "pages.moreOptions",
      "watermark.advanced",
    ]);
  });
});
