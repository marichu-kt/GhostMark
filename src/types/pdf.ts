export interface LoadedPdf {
  id: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  bytes: Uint8Array;
  password?: string;
  loadedAt: string;
}

export interface PdfImportResult {
  document: LoadedPdf;
}

export interface PdfExportResult {
  blob: Blob;
  url: string;
  fileName: string;
}
