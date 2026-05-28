import type { DocumentLayer, LayerType, RedactionRectangle, WatermarkConfig } from "../../types/watermark";
import { getDefaultLayerName } from "./layers";

function createDefaultRedactionRectangle(page = 1): RedactionRectangle {
  return {
    id: crypto.randomUUID(),
    page,
    x: 72,
    y: 640,
    width: 180,
    height: 36,
  };
}

export function createDefaultLayer(type: LayerType = "text", page = 1): DocumentLayer {
  return {
    id: crypto.randomUUID(),
    type,
    name: getDefaultLayerName(type),
    enabled: true,
    text: type === "pattern" ? "DRAFT" : "CONFIDENTIAL",
    fontSize: 64,
    color: "#2f343a",
    opacity: 0.18,
    rotation: 45,
    positionPreset: "center",
    x: 0,
    y: 0,
    scale: 0.35,
    pages: {
      mode: "all",
      selection: "",
    },
    // TODO: Below-content placement needs deeper PDF content-stream handling to be reliable.
    layer: "above-content",
    patternSpacingX: 220,
    patternSpacingY: 160,
    patternStaggered: true,
    classificationTop: true,
    classificationBottom: true,
    classificationText: "CONFIDENTIAL",
    bannerEnabledTop: true,
    bannerEnabledBottom: true,
    bannerMargin: 18,
    sealTitle: "REVIEWED",
    sealSubtitle: "DOCUMENT CONTROL",
    sealShowDate: true,
    sealBorderThickness: 2,
    redactionRectangles: type === "redaction" ? [createDefaultRedactionRectangle(page)] : [],
    redactionSearchText: "",
    redactionCaseSensitive: false,
  };
}

export function createDefaultWatermarkConfig(): WatermarkConfig {
  return createDefaultLayer("text");
}

export function createDefaultDocumentLayers(): DocumentLayer[] {
  return [createDefaultLayer("text")];
}

export function createLayerForType(type: LayerType, page = 1): DocumentLayer {
  const layer = createDefaultLayer(type, page);

  switch (type) {
    case "image":
      return { ...layer, name: "Image", opacity: 0.22, scale: 0.35, rotation: 0 };
    case "pattern":
      return { ...layer, name: "Pattern", text: "DRAFT", opacity: 0.12, fontSize: 38 };
    case "classification-banner":
      return {
        ...layer,
        name: "Banner",
        text: "CONFIDENTIAL",
        classificationText: "CONFIDENTIAL",
        opacity: 0.92,
        fontSize: 14,
        rotation: 0,
      };
    case "seal":
      return { ...layer, name: "Seal", opacity: 0.75, rotation: 0, positionPreset: "bottom-right" };
    case "redaction":
      return {
        ...layer,
        name: "Redaction",
        opacity: 1,
        rotation: 0,
        color: "#000000",
        redactionRectangles: [createDefaultRedactionRectangle(page)],
      };
    default:
      return { ...layer, name: "Text" };
  }
}
