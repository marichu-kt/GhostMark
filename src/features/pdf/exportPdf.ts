import type { PdfExportResult } from "../../types/pdf";
import type { DocumentLayer } from "../../types/watermark";
import { applyDocumentLayers } from "./applyWatermark";
import { encryptPdfBytes, type ExportPasswordProtectionOptions } from "./pdfEncryption";
import type { FlattenedExportQualityMode } from "./flattenedExportPlan";

export interface ExportPdfOptions {
  outputFileName: string;
  cleanupMetadata: boolean;
  exportQuality?: FlattenedExportQualityMode;
  inputPassword?: string;
  passwordProtection?: ExportPasswordProtectionOptions;
  onProgress?: (progress: { current: number; total: number }) => void;
}

export async function exportPdf(
  inputBytes: Uint8Array,
  layers: DocumentLayer[],
  options: ExportPdfOptions,
): Promise<PdfExportResult> {
  const bytes = await applyDocumentLayers(inputBytes, layers, {
    cleanupMetadata: options.cleanupMetadata,
    exportQuality: options.exportQuality,
    inputPassword: options.inputPassword,
    onProgress: options.onProgress,
  });
  const protectedBytes = options.passwordProtection
    ? await encryptPdfBytes(bytes, options.passwordProtection)
    : bytes;
  const blobBytes = new Uint8Array(protectedBytes);
  const blob = new Blob([blobBytes.buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const cleanFileName = options.outputFileName.trim() || "GhostMark-output.pdf";
  const fileName = cleanFileName.toLowerCase().endsWith(".pdf")
    ? cleanFileName
    : `${cleanFileName}.pdf`;

  return {
    blob,
    url,
    fileName,
  };
}
