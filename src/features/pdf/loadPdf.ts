import { PDFDocument } from "pdf-lib";
import type { LoadedPdf } from "../../types/pdf";

export class PdfImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfImportError";
  }
}

export function validatePdfFile(file: File): void {
  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  const hasValidMimeType = file.type === "application/pdf" || file.type === "";

  if (!hasPdfExtension || !hasValidMimeType) {
    throw new PdfImportError("Select a valid PDF file with a .pdf extension.");
  }
}

export async function loadPdf(file: File): Promise<LoadedPdf> {
  validatePdfFile(file);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const pdf = await PDFDocument.load(bytes.slice(), { updateMetadata: false });

    return {
      id: crypto.randomUUID(),
      fileName: file.name,
      fileSize: file.size,
      pageCount: pdf.getPageCount(),
      bytes,
      loadedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof PdfImportError) {
      throw error;
    }

    throw new PdfImportError("GhostMark could not read this PDF.");
  }
}
