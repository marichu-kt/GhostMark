import { describe, expect, it } from "vitest";
import { validateExportPasswordProtection } from "./pdfEncryption";

describe("validateExportPasswordProtection", () => {
  it("allows export when password protection is disabled", () => {
    expect(
      validateExportPasswordProtection({
        enabled: false,
        password: "",
        confirmPassword: "",
      }),
    ).toEqual({ isValid: true });
  });

  it("requires a password when protection is enabled", () => {
    expect(
      validateExportPasswordProtection({
        enabled: true,
        password: "",
        confirmPassword: "",
      }),
    ).toEqual({ isValid: false, messageKey: "export.passwordRequired" });
  });

  it("requires at least 12 characters", () => {
    expect(
      validateExportPasswordProtection({
        enabled: true,
        password: "eight888",
        confirmPassword: "eight888",
      }),
    ).toEqual({ isValid: false, messageKey: "export.passwordTooShort" });
  });

  it("rejects common weak passwords", () => {
    expect(
      validateExportPasswordProtection({
        enabled: true,
        password: "ghostmark",
        confirmPassword: "ghostmark",
      }),
    ).toEqual({ isValid: false, messageKey: "export.passwordWeak" });
    expect(
      validateExportPasswordProtection({
        enabled: true,
        password: "ghostmark000",
        confirmPassword: "ghostmark000",
      }),
    ).toEqual({ isValid: true });
  });

  it("requires matching confirmation", () => {
    expect(
      validateExportPasswordProtection({
        enabled: true,
        password: "strongpassphrase",
        confirmPassword: "different",
      }),
    ).toEqual({ isValid: false, messageKey: "export.passwordMismatch" });
  });

  it("accepts a matching 12-character passphrase", () => {
    expect(
      validateExportPasswordProtection({
        enabled: true,
        password: "longpass1234",
        confirmPassword: "longpass1234",
      }),
    ).toEqual({ isValid: true });
  });
});
