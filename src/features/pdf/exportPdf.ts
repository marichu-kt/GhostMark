import type { PdfExportResult } from "../../types/pdf";
import type { WatermarkConfig } from "../../types/watermark";
import { applyWatermark } from "./applyWatermark";

export interface ExportPdfOptions {
  outputFileName: string;
  cleanupMetadata: boolean;
}

export async function exportPdf(
  inputBytes: Uint8Array,
  config: WatermarkConfig,
  options: ExportPdfOptions,
): Promise<PdfExportResult> {
  const bytes = await applyWatermark(inputBytes, config, {
    cleanupMetadata: options.cleanupMetadata,
  });
  const blobBytes = new Uint8Array(bytes);
  const blob = new Blob([blobBytes.buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const fileName = options.outputFileName.toLowerCase().endsWith(".pdf")
    ? options.outputFileName
    : `${options.outputFileName}.pdf`;

  return {
    blob,
    url,
    fileName,
  };
}
