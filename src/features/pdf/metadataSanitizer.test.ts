import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { sanitizePdfMetadata } from "./metadataSanitizer";

describe("sanitizePdfMetadata", () => {
  it("neutralizes standard metadata without removing pages", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([200, 200]);
    pdf.setTitle("Sensitive title");
    pdf.setAuthor("Local User");
    pdf.setSubject("Private subject");
    pdf.setKeywords(["secret", "internal"]);
    pdf.setCreator("Original Tool");
    pdf.setProducer("Original Producer");

    sanitizePdfMetadata(pdf);

    const bytes = await pdf.save();
    const reloaded = await PDFDocument.load(bytes);

    expect(reloaded.getPageCount()).toBe(1);
    expect(reloaded.getTitle()).toBe("");
    expect(reloaded.getAuthor()).toBe("");
    expect(reloaded.getSubject()).toBe("");
    expect(reloaded.getKeywords()).toBe("");
    expect(reloaded.getCreator()).toBe("GhostMark");
    expect(reloaded.getProducer()).toContain("pdf-lib");
  });
});
