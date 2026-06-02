import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface PdfPageSize {
  width: number;
  height: number;
}

export interface RenderPdfPageOptions {
  signal?: AbortSignal;
  maxCanvasPixels?: number;
  password?: string;
}

const DEFAULT_MAX_CANVAS_PIXELS = 16_000_000;

function ensureNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new Error("PDF rendering was cancelled.");
  }
}

function getPixelRatioForCanvas(width: number, height: number, maxCanvasPixels: number) {
  const deviceScale = window.devicePixelRatio || 1;
  const requestedPixels = width * height * deviceScale * deviceScale;

  if (requestedPixels <= maxCanvasPixels) {
    return deviceScale;
  }

  // Keep the CSS preview size stable, but cap the backing canvas pixels so
  // oversized pages do not create huge render surfaces in the browser.
  return Math.max(1, deviceScale * Math.sqrt(maxCanvasPixels / requestedPixels));
}

export async function getPdfPageSize(
  bytes: Uint8Array,
  pageNumber: number,
  password?: string,
): Promise<PdfPageSize> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(), password });
  const pdf = await loadingTask.promise;

  try {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    return { width: viewport.width, height: viewport.height };
  } finally {
    await pdf.destroy();
  }
}

export async function getPdfPageSizes(bytes: Uint8Array, password?: string): Promise<PdfPageSize[]> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(), password });
  const pdf = await loadingTask.promise;

  try {
    const sizes: PdfPageSize[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      sizes.push({ width: viewport.width, height: viewport.height });
    }

    return sizes;
  } finally {
    await pdf.destroy();
  }
}

export async function renderPdfPageToCanvas(
  bytes: Uint8Array,
  canvas: HTMLCanvasElement,
  pageNumber: number,
  scale: number,
  options: RenderPdfPageOptions = {},
): Promise<void> {
  ensureNotAborted(options.signal);

  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(), password: options.password });
  const cancelLoad = () => {
    void loadingTask.destroy();
  };

  options.signal?.addEventListener("abort", cancelLoad, { once: true });
  const pdf = await loadingTask.promise.finally(() => {
    options.signal?.removeEventListener("abort", cancelLoad);
  });

  try {
    ensureNotAborted(options.signal);
    const page = await pdf.getPage(pageNumber);
    ensureNotAborted(options.signal);
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("Canvas rendering context is not available.");
    }

    const displayWidth = Math.floor(viewport.width);
    const displayHeight = Math.floor(viewport.height);
    const deviceScale = getPixelRatioForCanvas(
      displayWidth,
      displayHeight,
      options.maxCanvasPixels ?? DEFAULT_MAX_CANVAS_PIXELS,
    );

    canvas.width = Math.max(1, Math.floor(viewport.width * deviceScale));
    canvas.height = Math.max(1, Math.floor(viewport.height * deviceScale));
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    context.save();
    context.fillStyle = "#f7f5ef";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();

    const renderTask = page.render({
      canvasContext: context,
      viewport,
      transform: deviceScale !== 1 ? [deviceScale, 0, 0, deviceScale, 0, 0] : undefined,
    });
    const cancelRender = () => renderTask.cancel();

    options.signal?.addEventListener("abort", cancelRender, { once: true });

    try {
      await renderTask.promise;
    } finally {
      options.signal?.removeEventListener("abort", cancelRender);
    }
  } finally {
    options.signal?.removeEventListener("abort", cancelLoad);
    await pdf.destroy();
  }
}
