import type { PdfExportResult } from "../../types/pdf";
import type { DocumentLayer } from "../../types/watermark";
import { applyDocumentLayers } from "./applyWatermark";

export interface ExportPdfOptions {
  outputFileName: string;
  cleanupMetadata: boolean;
}

export async function exportPdf(
  inputBytes: Uint8Array,
  layers: DocumentLayer[],
  options: ExportPdfOptions,
): Promise<PdfExportResult> {
  const bytes = await applyDocumentLayers(inputBytes, layers, {
    cleanupMetadata: options.cleanupMetadata,
  });
  const blobBytes = new Uint8Array(bytes);
  const blob = new Blob([blobBytes.buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const cleanFileName = options.outputFileName.trim() || "ghostmark-watermarked.pdf";
  const fileName = cleanFileName.toLowerCase().endsWith(".pdf")
    ? cleanFileName
    : `${cleanFileName}.pdf`;

  return {
    blob,
    url,
    fileName,
  };
}
