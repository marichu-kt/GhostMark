import type { DocumentLayer } from "../../types/watermark";
import type { TranslationKey } from "../i18n/i18n";

export type BarcodeFormat = "CODE128" | "CODE39" | "EAN13";

export interface BarcodeValidationResult {
  isValid: boolean;
  normalizedValue: string;
  normalizedFormat: BarcodeFormat;
  messageKey?: TranslationKey;
}

const CODE39_PATTERN = /^[0-9A-Z .$/+%-]+$/;

export function calculateEan13Checksum(firstTwelveDigits: string): number {
  if (!/^\d{12}$/.test(firstTwelveDigits)) {
    throw new Error("EAN-13 checksum needs exactly 12 digits.");
  }

  const sum = firstTwelveDigits
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);

  return (10 - (sum % 10)) % 10;
}

export function validateBarcodeValue(value: string, format: BarcodeFormat): BarcodeValidationResult {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      isValid: false,
      normalizedValue: "",
      normalizedFormat: format,
      messageKey: "validation.addBarcodeValue",
    };
  }

  if (format === "CODE128") {
    return {
      isValid: true,
      normalizedValue: trimmedValue,
      normalizedFormat: format,
    };
  }

  if (format === "CODE39") {
    const normalizedValue = trimmedValue.toUpperCase();

    return {
      isValid: CODE39_PATTERN.test(normalizedValue),
      normalizedValue,
      normalizedFormat: format,
      messageKey: CODE39_PATTERN.test(normalizedValue) ? undefined : "validation.invalidBarcodeValue",
    };
  }

  if (!/^\d+$/.test(trimmedValue)) {
    return {
      isValid: false,
      normalizedValue: trimmedValue,
      normalizedFormat: format,
      messageKey: "validation.invalidEan13",
    };
  }

  if (trimmedValue.length === 12) {
    return {
      isValid: true,
      normalizedValue: `${trimmedValue}${calculateEan13Checksum(trimmedValue)}`,
      normalizedFormat: format,
    };
  }

  if (trimmedValue.length === 13) {
    const expectedChecksum = calculateEan13Checksum(trimmedValue.slice(0, 12));
    const actualChecksum = Number(trimmedValue[12]);

    return {
      isValid: expectedChecksum === actualChecksum,
      normalizedValue: trimmedValue,
      normalizedFormat: format,
      messageKey: expectedChecksum === actualChecksum ? undefined : "validation.invalidEan13",
    };
  }

  return {
    isValid: false,
    normalizedValue: trimmedValue,
    normalizedFormat: format,
    messageKey: "validation.invalidEan13",
  };
}

export function validateBarcodeLayer(layer: DocumentLayer): BarcodeValidationResult {
  return validateBarcodeValue(layer.barcodeValue, layer.barcodeFormat);
}
