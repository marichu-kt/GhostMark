import type { LoadedPdf } from "../../types/pdf";
import type { DocumentLayer, WatermarkConfig } from "../../types/watermark";

export interface SessionCleanupInput {
  loadedPdf?: LoadedPdf | null;
  generatedUrl?: string | null;
  watermarkConfig?: WatermarkConfig | null;
  layers?: DocumentLayer[] | null;
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
  layers,
}: SessionCleanupInput): void {
  wipeBytes(loadedPdf?.bytes);
  revokeObjectUrl(generatedUrl);

  if (watermarkConfig?.imageData) {
    wipeBytes(watermarkConfig.imageData);
  }

  for (const layer of layers ?? []) {
    if (layer.imageData) {
      wipeBytes(layer.imageData);
    }
  }
}
