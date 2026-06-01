import { describe, expect, it } from "vitest";
import { getExportFooterModel } from "./exportFlow";

describe("getExportFooterModel", () => {
  it("shows an immediate export action from the edit inspector", () => {
    expect(
      getExportFooterModel({
        hasDocument: true,
        activeStep: "edit",
        watermarkReady: true,
        generating: false,
        hasExportResult: false,
      }),
    ).toEqual({
      visible: true,
      disabled: false,
      labelKey: "actions.exportPdf",
      showDownloadIcon: false,
    });
  });

  it("does not require a second export confirmation after a completed export", () => {
    expect(
      getExportFooterModel({
        hasDocument: true,
        activeStep: "export",
        watermarkReady: true,
        generating: false,
        hasExportResult: true,
      }),
    ).toBeNull();
  });

  it("keeps export disabled during generation or invalid configuration", () => {
    expect(
      getExportFooterModel({
        hasDocument: true,
        activeStep: "edit",
        watermarkReady: false,
        generating: false,
        hasExportResult: false,
      })?.disabled,
    ).toBe(true);

    expect(
      getExportFooterModel({
        hasDocument: true,
        activeStep: "edit",
        watermarkReady: true,
        generating: true,
        hasExportResult: false,
      }),
    ).toMatchObject({
      disabled: true,
      labelKey: "preview.loading",
    });
  });
});
