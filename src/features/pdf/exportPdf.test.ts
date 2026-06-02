import { describe, expect, it, vi } from "vitest";
import { createCanvas, DOMMatrix, ImageData } from "canvas";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createDefaultDocumentLayers, createLayerForType } from "../watermark/defaults";

const sourceText = "COPY_ME_SHOULD_DISAPPEAR";

async function configurePdfJsWorker() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "../../../node_modules/pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).href;
  return pdfjsLib;
}

function installCanvasDom() {
  if (!("withResolvers" in Promise)) {
    Object.defineProperty(Promise, "withResolvers", {
      value: <T,>() => {
        let resolve!: (value: T | PromiseLike<T>) => void;
        let reject!: (reason?: unknown) => void;
        const promise = new Promise<T>((promiseResolve, promiseReject) => {
          resolve = promiseResolve;
          reject = promiseReject;
        });
        return { promise, resolve, reject };
      },
      configurable: true,
    });
  }

  Object.defineProperty(globalThis, "crypto", {
    value: {
      getRandomValues: <T extends Uint8Array>(array: T) => {
        array.fill(7);
        return array;
      },
      randomUUID: () => "test-id",
    } as unknown as Crypto,
    configurable: true,
  });

  Object.defineProperty(globalThis, "DOMMatrix", { value: DOMMatrix, configurable: true });
  Object.defineProperty(globalThis, "ImageData", { value: ImageData, configurable: true });
  Object.defineProperty(globalThis, "window", {
    value: {
      devicePixelRatio: 1,
      requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0),
      cancelAnimationFrame: (id: number) => clearTimeout(id),
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: {
      createElement: (tagName: string) => {
        if (tagName !== "canvas") {
          throw new Error(`Unsupported test element: ${tagName}`);
        }

        const canvas = createCanvas(1, 1) as unknown as HTMLCanvasElement & { style: Record<string, string> };
        (canvas as unknown as { style: Record<string, string> }).style = {};
        return canvas;
      },
    },
    configurable: true,
  });

  if (!globalThis.URL.createObjectURL) {
    Object.defineProperty(globalThis.URL, "createObjectURL", {
      value: vi.fn(() => "blob:ghostmark-test"),
      configurable: true,
    });
  }
}

function installRejectingCreateImageBitmap() {
  const createImageBitmapMock = vi.fn(async () => {
    throw new Error("Simulated SVG decode failure");
  });
  Object.defineProperty(globalThis, "createImageBitmap", {
    value: createImageBitmapMock,
    configurable: true,
  });
  (globalThis.window as Window & { createImageBitmap: typeof createImageBitmap }).createImageBitmap =
    createImageBitmapMock as unknown as typeof createImageBitmap;
  return createImageBitmapMock;
}

function installCanvasImageBitmap() {
  const createImageBitmapMock = vi.fn(async () => createCanvas(20, 20) as unknown as ImageBitmap);
  Object.defineProperty(globalThis, "createImageBitmap", {
    value: createImageBitmapMock,
    configurable: true,
  });
  (globalThis.window as Window & { createImageBitmap: typeof createImageBitmap }).createImageBitmap =
    createImageBitmapMock as unknown as typeof createImageBitmap;
  return createImageBitmapMock;
}

function createTestPngBytes(): Uint8Array {
  const canvas = createCanvas(20, 20);
  const context = canvas.getContext("2d");
  context.fillStyle = "#b91c1c";
  context.fillRect(0, 0, 20, 20);
  context.fillStyle = "#ffffff";
  context.fillRect(5, 5, 10, 10);
  return new Uint8Array(canvas.toBuffer("image/png"));
}

function bytesToBinaryString(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

async function createSelectableTextPdf(pageCount = 1) {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Sensitive source title");
  pdf.setAuthor("Sensitive source author");
  pdf.setSubject("Sensitive source subject");
  pdf.setKeywords(["sensitive", "source"]);
  pdf.setCreator("Sensitive source creator");
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const page = pdf.addPage([320, 180]);
    page.drawText(`${sourceText}_${pageIndex + 1}`, {
      x: 32,
      y: 96,
      size: 18,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return pdf.save();
}

async function extractText(bytes: Uint8Array, password?: string) {
  const pdfjsLib = await configurePdfJsWorker();
  const task = pdfjsLib.getDocument({ data: bytes.slice(), password, disableWorker: true } as unknown as Parameters<
    typeof pdfjsLib.getDocument
  >[0]);
  const pdf = await task.promise;
  const chunks: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      chunks.push(...content.items.map((item) => ("str" in item ? item.str : "")));
    }

    return { pageCount: pdf.numPages, text: chunks.join(" ") };
  } finally {
    await pdf.destroy();
  }
}

async function expectPdfPasswordFailure(bytes: Uint8Array, password?: string) {
  const pdfjsLib = await configurePdfJsWorker();
  const task = pdfjsLib.getDocument({ data: bytes.slice(), password, disableWorker: true } as unknown as Parameters<
    typeof pdfjsLib.getDocument
  >[0]);

  await expect(task.promise).rejects.toMatchObject({ name: "PasswordException" });
}

describe("exportPdf flattened output", () => {
  it("uses the production export path and removes extractable source text", async () => {
    installCanvasDom();
    const { exportPdf } = await import("./exportPdf");
    await configurePdfJsWorker();
    const inputBytes = await createSelectableTextPdf();
    const before = await extractText(new Uint8Array(inputBytes));

    expect(before.text).toContain(sourceText);

    const result = await exportPdf(new Uint8Array(inputBytes), createDefaultDocumentLayers(), {
      outputFileName: "flattened.pdf",
      cleanupMetadata: true,
    });
    const exportedBytes = new Uint8Array(await result.blob.arrayBuffer());
    const after = await extractText(exportedBytes);
    const reloaded = await PDFDocument.load(exportedBytes);

    expect(after.pageCount).toBe(before.pageCount);
    expect(result.fileName).toBe("flattened.pdf");
    expect(after.text).not.toContain(sourceText);
    expect(after.text.trim()).toBe("");
    expect(bytesToBinaryString(exportedBytes)).toContain("/DCTDecode");
    expect(bytesToBinaryString(exportedBytes)).not.toContain(sourceText);
    expect(reloaded.getTitle()).toBe("");
    expect(reloaded.getAuthor()).toBe("");
    expect(reloaded.getSubject()).toBe("");
    expect(reloaded.getKeywords()).toBe("");
    expect(reloaded.getCreator()).toBe("GhostMark");
  });

  it("exports SafeLayer and Blackout through the flattened production path without throwing", async () => {
    installCanvasDom();
    const createImageBitmapMock = installRejectingCreateImageBitmap();
    const { exportPdf } = await import("./exportPdf");
    await configurePdfJsWorker();
    const inputBytes = await createSelectableTextPdf(4);
    const before = await extractText(new Uint8Array(inputBytes));
    const safeLayer = {
      ...createLayerForType("safelayer"),
      id: "safe-layer-regression",
      text: "internal review",
      pages: { mode: "all" as const, selection: "" },
    };
    const blackout = {
      ...createLayerForType("blackout"),
      id: "blackout-regression",
      pages: { mode: "all" as const, selection: "" },
      blackoutRects: [{ id: "blackout-page-2", page: 2, x: 28, y: 88, width: 230, height: 30 }],
    };

    expect(before.pageCount).toBe(4);
    expect(before.text).toContain(sourceText);

    const result = await exportPdf(new Uint8Array(inputBytes), [blackout, safeLayer], {
      outputFileName: "safelayer-blackout.pdf",
      cleanupMetadata: true,
    });
    const exportedBytes = new Uint8Array(await result.blob.arrayBuffer());
    const after = await extractText(exportedBytes);
    const reloaded = await PDFDocument.load(exportedBytes);

    expect(after.pageCount).toBe(4);
    expect(result.fileName).toBe("safelayer-blackout.pdf");
    expect(after.text).not.toContain(sourceText);
    expect(after.text.trim()).toBe("");
    expect(reloaded.getTitle()).toBe("");
    expect(reloaded.getAuthor()).toBe("");
    expect(reloaded.getCreator()).toBe("GhostMark");
    expect(createImageBitmapMock).not.toHaveBeenCalled();
  }, 20_000);

  it("keeps source text non-extractable with text, pattern, image, seal, SafeLayer, and Blackout layers", async () => {
    installCanvasDom();
    const createImageBitmapMock = installCanvasImageBitmap();
    const { exportPdf } = await import("./exportPdf");
    await configurePdfJsWorker();
    const inputBytes = await createSelectableTextPdf(2);
    const text = {
      ...createLayerForType("text"),
      id: "text-layer",
      text: "CONFIDENTIAL",
      pages: { mode: "all" as const, selection: "" },
    };
    const pattern = {
      ...createLayerForType("pattern"),
      id: "pattern-layer",
      pages: { mode: "all" as const, selection: "" },
    };
    const seal = {
      ...createLayerForType("seal"),
      id: "seal-layer",
      pages: { mode: "all" as const, selection: "" },
    };
    const safeLayer = {
      ...createLayerForType("safelayer"),
      id: "safelayer-layer",
      pages: { mode: "all" as const, selection: "" },
    };
    const blackout = {
      ...createLayerForType("blackout"),
      id: "blackout-layer",
      pages: { mode: "all" as const, selection: "" },
      blackoutRects: [{ id: "rect-page-1", page: 1, x: 28, y: 88, width: 230, height: 30 }],
    };
    const image = {
      ...createLayerForType("image"),
      id: "image-layer",
      pages: { mode: "all" as const, selection: "" },
      imageData: createTestPngBytes(),
      imageMimeType: "image/png" as const,
    };

    const result = await exportPdf(new Uint8Array(inputBytes), [blackout, text, pattern, image, seal, safeLayer], {
      outputFileName: "all-layers.pdf",
      cleanupMetadata: true,
    });
    const exportedBytes = new Uint8Array(await result.blob.arrayBuffer());
    const after = await extractText(exportedBytes);
    const reloaded = await PDFDocument.load(exportedBytes);
    const rawPdf = bytesToBinaryString(exportedBytes);

    expect(after.pageCount).toBe(2);
    expect(after.text.trim()).toBe("");
    expect(rawPdf).toContain("/DCTDecode");
    expect(rawPdf).not.toContain(sourceText);
    expect(reloaded.getPageCount()).toBe(2);
    expect(reloaded.getTitle()).toBe("");
    expect(reloaded.getAuthor()).toBe("");
    expect(createImageBitmapMock).toHaveBeenCalled();
  }, 20_000);

  it("encrypts the flattened export with a required open password", async () => {
    installCanvasDom();
    const { exportPdf } = await import("./exportPdf");
    await configurePdfJsWorker();
    const inputBytes = await createSelectableTextPdf(2);

    const result = await exportPdf(new Uint8Array(inputBytes), createDefaultDocumentLayers(), {
      outputFileName: "protected.pdf",
      cleanupMetadata: true,
      passwordProtection: { password: "strongpass123" },
    });
    const exportedBytes = new Uint8Array(await result.blob.arrayBuffer());
    const rawPdf = bytesToBinaryString(exportedBytes);

    expect(rawPdf).toContain("/Encrypt");
    expect(rawPdf).toContain("/AESV3");
    await expectPdfPasswordFailure(exportedBytes);
    await expectPdfPasswordFailure(exportedBytes, "wrongpass123");

    const after = await extractText(exportedBytes, "strongpass123");
    expect(after.pageCount).toBe(2);
    expect(after.text.trim()).toBe("");
    expect(rawPdf).toContain("/DCTDecode");
    expect(rawPdf).not.toContain(sourceText);
  }, 20_000);
});
