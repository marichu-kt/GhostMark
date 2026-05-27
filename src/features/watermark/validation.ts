import type { LoadedPdf } from "../../types/pdf";
import type { WatermarkConfig } from "../../types/watermark";
import type { TranslationKey } from "../i18n/i18n";
import { resolvePageRules } from "../pdf/pageRules";

export interface WatermarkValidationResult {
  isValid: boolean;
  messageKey?: TranslationKey;
}

export function validateWatermarkConfig(
  config: WatermarkConfig,
  loadedPdf: LoadedPdf | null,
): WatermarkValidationResult {
  if (!loadedPdf) {
    return { isValid: false, messageKey: "validation.selectPdf" };
  }

  if ((config.type === "text" || config.type === "pattern") && !config.text.trim()) {
    return { isValid: false, messageKey: "validation.addWatermarkText" };
  }

  if (config.type === "classification-banner" && !config.classificationText.trim()) {
    return { isValid: false, messageKey: "validation.addWatermarkText" };
  }

  if (config.type === "seal" && !config.sealTitle.trim()) {
    return { isValid: false, messageKey: "validation.addSealTitle" };
  }

  if (config.type === "image" && !config.imageData) {
    return { isValid: false, messageKey: "validation.uploadImage" };
  }

  try {
    resolvePageRules(config.pages, loadedPdf.pageCount);
  } catch {
    return { isValid: false, messageKey: "validation.pageRange" };
  }

  return { isValid: true };
}

export function getWatermarkSummary(config: WatermarkConfig): string {
  switch (config.type) {
    case "text":
      return `Text: ${config.text.trim() || "Not set"}`;
    case "pattern":
      return `Pattern: ${config.text.trim() || "Not set"}`;
    case "classification-banner":
      return `Classification: ${config.classificationText.trim() || "Not set"}`;
    case "seal":
      return `Seal: ${config.sealTitle.trim() || "Not set"}`;
    case "image":
      return config.imageData ? "Image watermark ready" : "Image watermark missing";
    default:
      return "Watermark";
  }
}

export function getAffectedPagesSummary(config: WatermarkConfig, totalPages: number): string {
  try {
    const pages = resolvePageRules(config.pages, totalPages);

    if (pages.length === totalPages) {
      return `All ${totalPages} pages`;
    }

    if (pages.length === 1) {
      return `Page ${pages[0] + 1}`;
    }

    return `${pages.length} pages`;
  } catch {
    return "Invalid page selection";
  }
}
