import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { LoadedPdf } from "../../types/pdf";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export class PdfImportError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "PdfImportError";
    this.cause = cause;
  }
}

export type PdfPasswordErrorReason = "required" | "incorrect";

export class PdfPasswordRequiredError extends PdfImportError {
  reason: PdfPasswordErrorReason;

  constructor(reason: PdfPasswordErrorReason) {
    super(reason === "incorrect" ? "Incorrect PDF password." : "Password is required to open this PDF.");
    this.name = "PdfPasswordRequiredError";
    this.reason = reason;
  }
}

export function validatePdfFile(file: File): void {
  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  const hasValidMimeType = file.type === "application/pdf" || file.type === "";

  if (!hasPdfExtension || !hasValidMimeType) {
    throw new PdfImportError("Select a valid PDF file with a .pdf extension.");
  }
}

function getPasswordErrorReason(error: unknown): PdfPasswordErrorReason | null {
  if (!(error instanceof Error) || error.name !== "PasswordException") {
    return null;
  }

  const code = "code" in error ? Number((error as { code?: number }).code) : null;

  if (code === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD) {
    return "incorrect";
  }

  if (code === pdfjsLib.PasswordResponses.NEED_PASSWORD) {
    return "required";
  }

  return "required";
}

export interface LoadPdfOptions {
  password?: string;
}

export async function loadPdf(file: File, options: LoadPdfOptions = {}): Promise<LoadedPdf> {
  validatePdfFile(file);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({
      data: bytes.slice(),
      password: options.password,
      disableWorker: typeof window === "undefined",
    } as unknown as Parameters<typeof pdfjsLib.getDocument>[0]);
    const pdf = await loadingTask.promise;

    try {
      return {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileSize: file.size,
        pageCount: pdf.numPages,
        bytes,
        password: options.password,
        loadedAt: new Date().toISOString(),
      };
    } finally {
      await pdf.destroy();
    }
  } catch (error) {
    if (error instanceof PdfImportError) {
      throw error;
    }

    const passwordReason = getPasswordErrorReason(error);

    if (passwordReason) {
      throw new PdfPasswordRequiredError(passwordReason);
    }

    throw new PdfImportError("GhostMark could not read this PDF.", error);
  }
}
