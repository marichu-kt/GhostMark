export type LayerType =
  | "text"
  | "image"
  | "pattern"
  | "seal"
  | "safelayer"
  | "blackout";

export type WatermarkType = LayerType;

export type WatermarkLayer = "above-content" | "below-content";

export type PositionPreset =
  | "center"
  | "center-left"
  | "center-right"
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "diagonal-center";

export type SealInkStyle = "clean" | "real-ink" | "faded-ink";
export type SafeLayerStyle = "mixed" | "waves" | "contours" | "text-mesh";
export type SafeLayerDensity = "low" | "medium" | "high";
export type SafeLayerDistortion = "soft" | "medium" | "strong";

export interface BlackoutRect {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  sealTitle: string;
  sealSubtitle: string;
  sealDocumentId: string;
  sealStyle: "rectangular" | "circular";
  sealInkStyle: SealInkStyle;
  sealShowDate: boolean;
  sealBorderThickness: number;
  safeLayerStyle: SafeLayerStyle;
  safeLayerDensity: SafeLayerDensity;
  safeLayerDistortion: SafeLayerDistortion;
  safeLayerSeed: string;
  safeLayerTextSpacing: number;
  safeLayerLineSpacing: number;
  safeLayerWaveStrength: number;
  safeLayerContourStrength: number;
  blackoutRects: BlackoutRect[];
}

export type WatermarkConfig = DocumentLayer;

export type TextLayerConfig = DocumentLayer & { type: "text" };
export type ImageLayerConfig = DocumentLayer & { type: "image" };
export type PatternLayerConfig = DocumentLayer & { type: "pattern" };
export type SealLayerConfig = DocumentLayer & { type: "seal" };
export type SafeLayerConfig = DocumentLayer & { type: "safelayer" };
export type BlackoutLayerConfig = DocumentLayer & { type: "blackout" };
