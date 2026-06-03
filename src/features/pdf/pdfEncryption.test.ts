import { describe, expect, it } from "vitest";
import {
  clearExportPasswordProtection,
  enableExportPasswordProtection,
  validateExportPasswordProtection,
} from "./pdfEncryption";

describe("validateExportPasswordProtection", () => {
  it("enables and clears password protection without creating visual layer state", () => {
    const enabled = enableExportPasswordProtection({
      enabled: false,
      password: "SensitiveLongPass1!",
      confirmPassword: "SensitiveLongPass1!",
    });

    expect(enabled).toEqual({
      enabled: true,
      password: "SensitiveLongPass1!",
      confirmPassword: "SensitiveLongPass1!",
    });
    expect(clearExportPasswordProtection()).toEqual({
      enabled: false,
      password: "",
      confirmPassword: "",
    });
  });

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
    for (const password of ["ghostmark", "00000000", "letmein", "welcome", "iloveyou"]) {
      expect(validateExportPasswordProtection({
        enabled: true,
        password,
        confirmPassword: password,
      })).toEqual({ isValid: false, messageKey: "export.passwordWeak" });
    }
  });

  it("rejects predictable 12-character passwords", () => {
    expect(
      validateExportPasswordProtection({
        enabled: true,
        password: "111111111111",
        confirmPassword: "111111111111",
      }),
    ).toEqual({ isValid: false, messageKey: "export.passwordWeak" });
  });

  it("requires password confirmation", () => {
    expect(
      validateExportPasswordProtection({
        enabled: true,
        password: "strongpassphrase",
        confirmPassword: "",
      }),
    ).toEqual({ isValid: false, messageKey: "export.confirmPasswordRequired" });
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
