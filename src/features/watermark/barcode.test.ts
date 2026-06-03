import { describe, expect, it } from "vitest";
import { calculateEan13Checksum, validateBarcodeValue } from "./barcode";

describe("barcode validation", () => {
  it("accepts Code 128 document identifiers", () => {
    expect(validateBarcodeValue("GHOSTMARK-001", "CODE128")).toMatchObject({
      isValid: true,
      normalizedValue: "GHOSTMARK-001",
    });
    expect(validateBarcodeValue("GM-2026-A7F3", "CODE128")).toMatchObject({
      isValid: true,
      normalizedValue: "GM-2026-A7F3",
    });
  });

  it("normalizes Code 39 values and rejects unsupported characters", () => {
    expect(validateBarcodeValue("gm-2026/a", "CODE39")).toMatchObject({
      isValid: true,
      normalizedValue: "GM-2026/A",
    });
    expect(validateBarcodeValue("invoice_2026", "CODE39")).toMatchObject({
      isValid: false,
      messageKey: "validation.invalidBarcodeValue",
    });
  });

  it("validates EAN-13 numeric values and checksums", () => {
    expect(calculateEan13Checksum("400638133393")).toBe(1);
    expect(validateBarcodeValue("400638133393", "EAN13")).toMatchObject({
      isValid: true,
      normalizedValue: "4006381333931",
    });
    expect(validateBarcodeValue("4006381333931", "EAN13")).toMatchObject({
      isValid: true,
      normalizedValue: "4006381333931",
    });
    expect(validateBarcodeValue("4006381333932", "EAN13")).toMatchObject({
      isValid: false,
      messageKey: "validation.invalidEan13",
    });
    expect(validateBarcodeValue("GHOSTMARK-001", "EAN13")).toMatchObject({
      isValid: false,
      messageKey: "validation.invalidEan13",
    });
    expect(validateBarcodeValue("12345", "EAN13")).toMatchObject({
      isValid: false,
      messageKey: "validation.invalidEan13",
    });
  });
});
