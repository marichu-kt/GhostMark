import type { LoadedPdf } from "../../types/pdf";
import type { DocumentLayer, WatermarkConfig } from "../../types/watermark";
import type { TranslationKey } from "../i18n/i18n";
import { resolvePageRules } from "../pdf/pageRules";
import { getEnabledLayers, getLayerDisplayName } from "./layers";

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

  if (config.type === "redaction" && config.redactionRectangles.length === 0) {
    return { isValid: false, messageKey: "validation.addRedactionRectangle" };
  }

  try {
    resolvePageRules(config.pages, loadedPdf.pageCount);
  } catch {
    return { isValid: false, messageKey: "validation.pageRange" };
  }

  return { isValid: true };
}

export function validateDocumentLayers(
  layers: DocumentLayer[],
  loadedPdf: LoadedPdf | null,
): WatermarkValidationResult {
  if (!loadedPdf) {
    return { isValid: false, messageKey: "validation.selectPdf" };
  }

  const enabledLayers = getEnabledLayers(layers);

  if (enabledLayers.length === 0) {
    return { isValid: false, messageKey: "validation.addLayer" };
  }

  for (const layer of enabledLayers) {
    const result = validateWatermarkConfig(layer, loadedPdf);

    if (!result.isValid) {
      return result;
    }
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
    case "redaction":
      return `Redaction: ${config.redactionRectangles.length} areas`;
    default:
      return "Watermark";
  }
}

export function getLayersSummary(layers: DocumentLayer[]): string {
  const enabledLayers = getEnabledLayers(layers);

  if (enabledLayers.length === 0) {
    return "No enabled layers";
  }

  if (enabledLayers.length === 1) {
    return getWatermarkSummary(enabledLayers[0]);
  }

  return `${enabledLayers.length} layers`;
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

export function getDocumentAffectedPagesSummary(layers: DocumentLayer[], totalPages: number): string {
  const pages = new Set<number>();

  try {
    for (const layer of getEnabledLayers(layers)) {
      for (const pageIndex of resolvePageRules(layer.pages, totalPages)) {
        pages.add(pageIndex);
      }
    }
  } catch {
    return "Invalid page selection";
  }

  if (pages.size === totalPages) {
    return `All ${totalPages} pages`;
  }

  if (pages.size === 1) {
    return `Page ${Array.from(pages)[0] + 1}`;
  }

  return `${pages.size} pages`;
}

export function getLayerListSummary(layer: DocumentLayer): string {
  if (layer.type === "redaction") {
    return `${getLayerDisplayName(layer)}: ${layer.redactionRectangles.length} areas`;
  }

  return getWatermarkSummary(layer);
}
