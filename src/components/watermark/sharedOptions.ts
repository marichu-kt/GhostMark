import type { PositionPreset, WatermarkLayer } from "../../types/watermark";
import type { TranslationKey } from "../../features/i18n/i18n";

export const positionPresets: Array<{ value: PositionPreset; labelKey: TranslationKey }> = [
  { value: "center", labelKey: "position.center" },
  { value: "top-left", labelKey: "position.top-left" },
  { value: "top-center", labelKey: "position.top-center" },
  { value: "top-right", labelKey: "position.top-right" },
  { value: "bottom-left", labelKey: "position.bottom-left" },
  { value: "bottom-center", labelKey: "position.bottom-center" },
  { value: "bottom-right", labelKey: "position.bottom-right" },
  { value: "diagonal-center", labelKey: "position.diagonal-center" },
];

export const layerOptions: Array<{ value: WatermarkLayer; labelKey: TranslationKey; disabled?: boolean }> = [
  { value: "above-content", labelKey: "watermark.layerAbove" },
  { value: "below-content", labelKey: "watermark.layerBelow", disabled: true },
];
