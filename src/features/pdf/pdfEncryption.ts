export interface ExportPasswordProtection {
  enabled: boolean;
  password: string;
  confirmPassword: string;
}

export interface ExportPasswordProtectionOptions {
  password: string;
}

export interface PasswordValidationResult {
  isValid: boolean;
  messageKey?:
    | "export.passwordRequired"
    | "export.confirmPasswordRequired"
    | "export.passwordTooShort"
    | "export.passwordMismatch"
    | "export.passwordWeak";
}

export const EXPORT_PASSWORD_MIN_LENGTH = 12;
export const EMPTY_EXPORT_PASSWORD_PROTECTION: ExportPasswordProtection = {
  enabled: false,
  password: "",
  confirmPassword: "",
};

const WEAK_EXPORT_PASSWORDS = new Set([
  "password",
  "12345678",
  "123456789",
  "qwerty",
  "ghostmark",
  "admin123",
  "11111111",
  "00000000",
  "letmein",
  "welcome",
  "iloveyou",
]);

function isPredictablePassword(password: string): boolean {
  const normalized = password.trim().toLowerCase();

  return /^(.)\1+$/.test(normalized) || /^(123456789|987654321|qwerty|password)/.test(normalized);
}

function createOwnerPassword() {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function enableExportPasswordProtection(
  protection: ExportPasswordProtection,
): ExportPasswordProtection {
  return {
    ...protection,
    enabled: true,
  };
}

export function clearExportPasswordProtection(): ExportPasswordProtection {
  return { ...EMPTY_EXPORT_PASSWORD_PROTECTION };
}

export function validateExportPasswordProtection(
  protection: ExportPasswordProtection,
): PasswordValidationResult {
  if (!protection.enabled) {
    return { isValid: true };
  }

  if (!protection.password) {
    return { isValid: false, messageKey: "export.passwordRequired" };
  }

  if (WEAK_EXPORT_PASSWORDS.has(protection.password.trim().toLowerCase()) || isPredictablePassword(protection.password)) {
    return { isValid: false, messageKey: "export.passwordWeak" };
  }

  if (protection.password.length < EXPORT_PASSWORD_MIN_LENGTH) {
    return { isValid: false, messageKey: "export.passwordTooShort" };
  }

  if (!protection.confirmPassword) {
    return { isValid: false, messageKey: "export.confirmPasswordRequired" };
  }

  if (protection.password !== protection.confirmPassword) {
    return { isValid: false, messageKey: "export.passwordMismatch" };
  }

  return { isValid: true };
}

export async function encryptPdfBytes(
  bytes: Uint8Array,
  options: ExportPasswordProtectionOptions,
): Promise<Uint8Array> {
  const { PDF } = await import("@libpdf/core");
  const pdf = await PDF.load(bytes);

  pdf.setProtection({
    userPassword: options.password,
    ownerPassword: createOwnerPassword(),
    algorithm: "AES-256",
    encryptMetadata: true,
    permissions: {
      annotate: false,
      assemble: false,
      copy: false,
      fillForms: false,
      modify: false,
      print: false,
      printHighQuality: false,
    },
  });

  return new Uint8Array(await pdf.save({ compressStreams: true }));
}
