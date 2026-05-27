import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface PdfPageSize {
  width: number;
  height: number;
}

export async function getPdfPageSize(bytes: Uint8Array, pageNumber: number): Promise<PdfPageSize> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;

  try {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    return { width: viewport.width, height: viewport.height };
  } finally {
    await pdf.destroy();
  }
}

export async function renderPdfPageToCanvas(
  bytes: Uint8Array,
  canvas: HTMLCanvasElement,
  pageNumber: number,
  scale: number,
): Promise<void> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;

  try {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("Canvas rendering context is not available.");
    }

    const deviceScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * deviceScale);
    canvas.height = Math.floor(viewport.height * deviceScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    context.save();
    context.fillStyle = "#f7f5ef";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();

    await page.render({
      canvasContext: context,
      viewport,
      transform: deviceScale !== 1 ? [deviceScale, 0, 0, deviceScale, 0, 0] : undefined,
    }).promise;
  } finally {
    await pdf.destroy();
  }
}
