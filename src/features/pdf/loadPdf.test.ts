import { describe, expect, it, vi } from "vitest";
import { DOMMatrix, ImageData } from "canvas";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { PDF } from "@libpdf/core";
import type { PdfPasswordRequiredError } from "./loadPdf";

function installCrypto() {
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
        array.fill(11);
        return array;
      },
      randomUUID: () => "test-pdf-id",
    } as unknown as Crypto,
    configurable: true,
  });
  Object.defineProperty(globalThis, "DOMMatrix", { value: DOMMatrix, configurable: true });
  Object.defineProperty(globalThis, "ImageData", { value: ImageData, configurable: true });
}

async function createPdfBytes() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([240, 180]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("Password fixture", { x: 32, y: 96, size: 18, font });
  return new Uint8Array(await pdf.save());
}

async function createEncryptedPdfBytes(password: string) {
  const pdf = await PDF.load(await createPdfBytes());
  pdf.setProtection({
    userPassword: password,
    ownerPassword: "owner-password-for-test",
    algorithm: "AES-256",
  });
  return new Uint8Array(await pdf.save());
}

function createTestFile(bytes: Uint8Array, name = "fixture.pdf"): File {
  return {
    name,
    type: "application/pdf",
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as File;
}

async function importLoadPdf() {
  const module = await import("./loadPdf");
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "../../../node_modules/pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).href;
  return module;
}

describe("loadPdf", () => {
  it("loads a normal PDF without a password", async () => {
    installCrypto();
    const { loadPdf } = await importLoadPdf();
    const document = await loadPdf(createTestFile(await createPdfBytes()));

    expect(document.fileName).toBe("fixture.pdf");
    expect(document.pageCount).toBe(1);
    expect(document.password).toBeUndefined();
  });

  it("asks for a password when the PDF is encrypted", async () => {
    installCrypto();
    const { loadPdf } = await importLoadPdf();
    const file = createTestFile(await createEncryptedPdfBytes("open-password"));

    await expect(loadPdf(file)).rejects.toMatchObject({
      name: "PdfPasswordRequiredError",
      reason: "required",
    } satisfies Partial<PdfPasswordRequiredError>);
  });

  it("allows retry after an incorrect password", async () => {
    installCrypto();
    const { loadPdf } = await importLoadPdf();
    const file = createTestFile(await createEncryptedPdfBytes("open-password"));

    await expect(loadPdf(file, { password: "wrong-password" })).rejects.toMatchObject({
      name: "PdfPasswordRequiredError",
      reason: "incorrect",
    } satisfies Partial<PdfPasswordRequiredError>);
  });

  it("loads an encrypted PDF with the correct password without persisting it", async () => {
    installCrypto();
    const localStorage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() };
    const sessionStorage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() };
    Object.defineProperty(globalThis, "localStorage", { value: localStorage, configurable: true });
    Object.defineProperty(globalThis, "sessionStorage", { value: sessionStorage, configurable: true });
    const { loadPdf } = await importLoadPdf();
    const file = createTestFile(await createEncryptedPdfBytes("open-password"));
    const document = await loadPdf(file, { password: "open-password" });

    expect(document.pageCount).toBe(1);
    expect(document.password).toBe("open-password");
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });
});
