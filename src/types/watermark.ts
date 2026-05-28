export type LayerType =
  | "text"
  | "image"
  | "pattern"
  | "classification-banner"
  | "seal";

export type WatermarkType = LayerType;

export type WatermarkLayer = "above-content" | "below-content";

export type PositionPreset =
  | "center"
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "diagonal-center";

export type PageRuleMode =
  | "all"
  | "first"
  | "last"
  | "odd"
  | "even"
  | "range"
  | "specific"
  | "exclude";

export interface PageRuleConfig {
  mode: PageRuleMode;
  selection: string;
}

export interface DocumentLayer {
  id: string;
  type: LayerType;
  name: string;
  enabled: boolean;
  locked?: boolean;
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  positionPreset: PositionPreset;
  x: number;
  y: number;
  scale: number;
  pages: PageRuleConfig;
  layer: WatermarkLayer;
  imageData?: Uint8Array;
  imageMimeType?: "image/png" | "image/jpeg";
  patternSpacingX: number;
  patternSpacingY: number;
  patternStaggered: boolean;
  classificationTop: boolean;
  classificationBottom: boolean;
  classificationText: string;
  bannerEnabledTop: boolean;
  bannerEnabledBottom: boolean;
  bannerMargin: number;
  sealTitle: string;
  sealSubtitle: string;
  sealShowDate: boolean;
  sealBorderThickness: number;
}

export type WatermarkConfig = DocumentLayer;

export type TextLayerConfig = DocumentLayer & { type: "text" };
export type ImageLayerConfig = DocumentLayer & { type: "image" };
export type PatternLayerConfig = DocumentLayer & { type: "pattern" };
export type ClassificationBannerLayerConfig = DocumentLayer & { type: "classification-banner" };
export type SealLayerConfig = DocumentLayer & { type: "seal" };

export interface WatermarkPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<WatermarkConfig>;
}
