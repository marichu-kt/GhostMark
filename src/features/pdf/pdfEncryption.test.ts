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

  it("requires at least 8 characters", () => {
    expect(
      validateExportPasswordProtection({
        enabled: true,
        password: "short",
        confirmPassword: "short",
      }),
    ).toEqual({ isValid: false, messageKey: "export.passwordTooShort" });
  });

  it("requires matching confirmation", () => {
    expect(
      validateExportPasswordProtection({
        enabled: true,
        password: "strongpass",
        confirmPassword: "different",
      }),
    ).toEqual({ isValid: false, messageKey: "export.passwordMismatch" });
  });
});
