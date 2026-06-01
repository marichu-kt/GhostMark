import { describe, expect, it } from "vitest";
import { createDownloadFileName } from "./fileFormatting";

describe("createDownloadFileName", () => {
  it("uses the original base name with the GhostMark suffix", () => {
    expect(createDownloadFileName("file.pdf")).toBe("file-GhostMark.pdf");
    expect(createDownloadFileName("sample-empty.pdf")).toBe("sample-empty-GhostMark.pdf");
    expect(createDownloadFileName("my.document.v1.pdf")).toBe("my.document.v1-GhostMark.pdf");
  });

  it("removes only the final PDF extension and sanitizes unsafe characters", () => {
    expect(createDownloadFileName("quarterly/report:final.pdf")).toBe("quarterly-report-final-GhostMark.pdf");
    expect(createDownloadFileName("notes.pdf.backup")).toBe("notes.pdf.backup-GhostMark.pdf");
  });

  it("falls back to a safe default name", () => {
    expect(createDownloadFileName("")).toBe("GhostMark-output.pdf");
    expect(createDownloadFileName("???.pdf")).toBe("GhostMark-output.pdf");
  });
});
