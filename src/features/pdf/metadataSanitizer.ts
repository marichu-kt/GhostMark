import { PDFDocument } from "pdf-lib";

const SANITIZED_DATE = new Date("2000-01-01T00:00:00.000Z");

export function sanitizePdfMetadata(pdfDoc: PDFDocument): void {
  pdfDoc.setTitle("");
  pdfDoc.setAuthor("");
  pdfDoc.setSubject("");
  pdfDoc.setKeywords([]);
  pdfDoc.setCreator("GhostMark");
  pdfDoc.setCreationDate(SANITIZED_DATE);
  pdfDoc.setModificationDate(SANITIZED_DATE);

  // pdf-lib exposes the standard document info dictionary reliably. It does not
  // provide a stable public API for every possible XMP metadata stream variant,
  // so GhostMark neutralizes supported metadata fields without claiming certified
  // forensic sanitization. pdf-lib may write its own Producer value on save.
}
