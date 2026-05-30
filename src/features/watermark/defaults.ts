import type { DocumentLayer, LayerType, WatermarkConfig } from "../../types/watermark";
import { getDefaultLayerName } from "./layers";

export function createDefaultLayer(type: LayerType = "text"): DocumentLayer {
  return {
    id: crypto.randomUUID(),
    type,
    name: getDefaultLayerName(type),
    enabled: true,
    text: type === "pattern" ? "DRAFT" : type === "safelayer" ? "ONLY VALID FOR REVIEW" : "CONFIDENTIAL",
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
    sealTitle: "REVIEWED",
    sealSubtitle: "DOCUMENT CONTROL",
    sealDocumentId: "",
    sealStyle: "rectangular",
    sealInkStyle: "clean",
    sealShowDate: true,
    sealBorderThickness: 2,
    safeLayerStyle: "mixed",
    safeLayerDensity: "medium",
    safeLayerDistortion: "medium",
    safeLayerSeed: "",
    safeLayerTextSpacing: 150,
    safeLayerLineSpacing: 84,
    safeLayerWaveStrength: 18,
    safeLayerContourStrength: 16,
    blackoutRects: [],
  };
}

export function createDefaultWatermarkConfig(): WatermarkConfig {
  return createDefaultLayer("text");
}

export function createDefaultDocumentLayers(): DocumentLayer[] {
  return [createDefaultLayer("text")];
}

export function createLayerForType(type: LayerType): DocumentLayer {
  const layer = createDefaultLayer(type);

  switch (type) {
    case "image":
      return { ...layer, name: "Image", opacity: 0.22, scale: 0.35, rotation: 0 };
    case "pattern":
      return { ...layer, name: "Pattern", text: "DRAFT", opacity: 0.12, fontSize: 38 };
    case "seal":
      return {
        ...layer,
        name: "Seal",
        color: "#7d3432",
        opacity: 0.72,
        rotation: -8,
        scale: 1,
        positionPreset: "bottom-right",
      };
    case "safelayer":
      return {
        ...layer,
        name: "SafeLayer",
        color: "#7d3432",
        opacity: 0.22,
        rotation: -24,
        fontSize: 22,
        safeLayerSeed: crypto.randomUUID(),
      };
    case "blackout":
      return {
        ...layer,
        name: "Blackout",
        opacity: 1,
        rotation: 0,
        color: "#000000",
        text: "",
        blackoutRects: [
          {
            id: crypto.randomUUID(),
            page: 1,
            x: 72,
            y: 650,
            width: 180,
            height: 28,
          },
        ],
      };
    default:
      return { ...layer, name: "Text" };
  }
}
