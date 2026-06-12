import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));
const applyWatermarkSource = readFileSync(resolve(currentDir, "applyWatermark.ts"), "utf8");
const exportPdfSource = readFileSync(resolve(currentDir, "exportPdf.ts"), "utf8");

describe("production export path guard", () => {
  it("keeps the active export path flattened and avoids original page copying APIs", () => {
    const activeExportSource = `${applyWatermarkSource}\n${exportPdfSource}`;

    expect(activeExportSource).toContain("createFlattenedPdf");
    expect(activeExportSource).toContain("renderPdfPageToCanvas");
    expect(activeExportSource).toContain("embedJpg");
    expect(activeExportSource).not.toMatch(/\bcopyPages\b|\bcopyPage\b|\bembedPage\b|\bdrawPage\b/);
  });
});
