export type LayerType =
  | "text"
  | "image"
  | "pattern"
  | "seal"
  | "safelayer"
  | "blackout"
  | "qr"
  | "barcode"
  | "signature";

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

export type SafeLayerStyle = "mixed" | "waves" | "contours" | "text-mesh";
export type SafeLayerDistortion = "soft" | "medium" | "strong";

export interface BlackoutRect {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SignaturePoint {
  x: number;
  y: number;
}

export interface SignatureStroke {
  id: string;
  points: SignaturePoint[];
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
  sealShowDate: boolean;
  sealBorderThickness: number;
  safeLayerStyle: SafeLayerStyle;
  safeLayerDistortion: SafeLayerDistortion;
  safeLayerSeed: string;
  safeLayerTextSpacing: number;
  safeLayerLineSpacing: number;
  safeLayerWaveStrength: number;
  safeLayerContourStrength: number;
  safeLayerHolographicIntensity: number;
  blackoutRects: BlackoutRect[];
  qrContent: string;
  qrSize: number;
  barcodeValue: string;
  barcodeFormat: "CODE128";
  barcodeWidth: number;
  barcodeHeight: number;
  signatureMode: "typed" | "drawn";
  signatureText: string;
  signatureStyle: "classic" | "formal" | "compact";
  signatureWidth: number;
  signatureHeight: number;
  signatureStrokes: SignatureStroke[];
}

export type WatermarkConfig = DocumentLayer;

export type TextLayerConfig = DocumentLayer & { type: "text" };
export type ImageLayerConfig = DocumentLayer & { type: "image" };
export type PatternLayerConfig = DocumentLayer & { type: "pattern" };
export type SealLayerConfig = DocumentLayer & { type: "seal" };
export type SafeLayerConfig = DocumentLayer & { type: "safelayer" };
export type BlackoutLayerConfig = DocumentLayer & { type: "blackout" };
export type QrLayerConfig = DocumentLayer & { type: "qr" };
export type BarcodeLayerConfig = DocumentLayer & { type: "barcode" };
export type SignatureLayerConfig = DocumentLayer & { type: "signature" };
