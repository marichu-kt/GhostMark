import type { LoadedPdf } from "../../types/pdf";
import type { WatermarkConfig } from "../../types/watermark";

export interface SessionCleanupInput {
  loadedPdf?: LoadedPdf | null;
  generatedUrl?: string | null;
  watermarkConfig?: WatermarkConfig | null;
}

export function wipeBytes(bytes?: Uint8Array): void {
  if (bytes) {
    bytes.fill(0);
  }
}

export function revokeObjectUrl(url?: string | null): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

export function cleanupSessionReferences({
  loadedPdf,
  generatedUrl,
  watermarkConfig,
}: SessionCleanupInput): void {
  wipeBytes(loadedPdf?.bytes);
  revokeObjectUrl(generatedUrl);

  if (watermarkConfig?.imageData) {
    wipeBytes(watermarkConfig.imageData);
  }
}
