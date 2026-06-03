import { describe, expect, it } from "vitest";
import { validateExportPasswordProtection } from "./pdfEncryption";
import {
  generatePassphrase,
  generatePassword,
  getPasswordQuality,
} from "./passwordGenerator";

Object.defineProperty(globalThis, "crypto", {
  value: {
    getRandomValues: <T extends Uint32Array>(array: T) => {
      for (let index = 0; index < array.length; index += 1) {
        array[index] = (index + 11) * 17;
      }
      return array;
    },
  } as unknown as Crypto,
  configurable: true,
});

describe("password generator", () => {
  it("generates a validating mixed password", () => {
    const password = generatePassword({
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      extendedAscii: false,
    });

    expect(password.length).toBe(16);
    expect(validateExportPasswordProtection({
      enabled: true,
      password,
      confirmPassword: password,
    })).toEqual({ isValid: true });
    expect(["good", "excellent"]).toContain(getPasswordQuality(password));
  });

  it("generates a validating local passphrase", () => {
    const passphrase = generatePassphrase({
      wordCount: 5,
      separator: "-",
      wordCase: "lower",
    });

    expect(passphrase.split("-")).toHaveLength(5);
    expect(validateExportPasswordProtection({
      enabled: true,
      password: passphrase,
      confirmPassword: passphrase,
    })).toEqual({ isValid: true });
    expect(["good", "excellent"]).toContain(getPasswordQuality(passphrase));
  });
});
