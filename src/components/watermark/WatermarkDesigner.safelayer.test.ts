import { describe, expect, it } from "vitest";
import {
  ADD_MARK_PROTECTION_BUTTON_KEYS,
  PASSWORD_GENERATOR_VISIBLE_KEYS,
  SAFELAYER_VISIBLE_INSPECTOR_KEYS,
} from "./WatermarkDesigner";

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

describe("WatermarkDesigner add panel", () => {
  it("keeps the final ten-button watermark/protection grid contract", () => {
    expect(ADD_MARK_PROTECTION_BUTTON_KEYS).toEqual([
      "layers.text",
      "layers.image",
      "layers.pattern",
      "layers.seal",
      "layers.safelayer",
      "layers.blackout",
      "layers.qr",
      "layers.barcode",
      "layers.signature",
      "layers.password",
    ]);
  });

  it("keeps entropy bits out of the password generator UI contract", () => {
    expect(PASSWORD_GENERATOR_VISIBLE_KEYS.join(" ")).not.toMatch(/entropy|bits/i);
  });
});
