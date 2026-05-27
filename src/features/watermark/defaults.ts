import type { WatermarkConfig } from "../../types/watermark";

export function createDefaultWatermarkConfig(): WatermarkConfig {
  return {
    id: crypto.randomUUID(),
    type: "text",
    text: "CONFIDENTIAL",
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
  };
}
