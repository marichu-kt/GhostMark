export type WatermarkType =
  | "text"
  | "image"
  | "pattern"
  | "classification-banner"
  | "seal";

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

export interface WatermarkConfig {
  id: string;
  type: WatermarkType;
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

export interface WatermarkPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<WatermarkConfig>;
}
