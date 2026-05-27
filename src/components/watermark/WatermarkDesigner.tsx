import type { WatermarkConfig, WatermarkType } from "../../types/watermark";
import { createDefaultWatermarkConfig } from "../../features/watermark/defaults";
import { PresetSelector } from "./PresetSelector";
import { ClassificationBannerPanel } from "./ClassificationBannerPanel";
import { ImageWatermarkPanel } from "./ImageWatermarkPanel";
import { PatternWatermarkPanel } from "./PatternWatermarkPanel";
import { SealPanel } from "./SealPanel";
import { TextWatermarkPanel } from "./TextWatermarkPanel";
import { WatermarkTypeSelector } from "./WatermarkTypeSelector";

interface WatermarkDesignerProps {
  config: WatermarkConfig;
  onChange: (config: WatermarkConfig) => void;
}

export function WatermarkDesigner({ config, onChange }: WatermarkDesignerProps) {
  function patchConfig(patch: Partial<WatermarkConfig>) {
    onChange({ ...config, ...patch });
  }

  function setType(type: WatermarkType) {
    patchConfig({ type });
  }

  return (
    <>
      <WatermarkTypeSelector value={config.type} onChange={setType} />
      <PresetSelector onApply={patchConfig} />
      {config.type === "text" ? (
        <TextWatermarkPanel
          config={config}
          onChange={patchConfig}
          onReset={() => onChange(createDefaultWatermarkConfig())}
        />
      ) : null}
      {config.type === "image" ? <ImageWatermarkPanel config={config} onChange={patchConfig} /> : null}
      {config.type === "pattern" ? (
        <PatternWatermarkPanel config={config} onChange={patchConfig} />
      ) : null}
      {config.type === "classification-banner" ? (
        <ClassificationBannerPanel config={config} onChange={patchConfig} />
      ) : null}
      {config.type === "seal" ? <SealPanel config={config} onChange={patchConfig} /> : null}
    </>
  );
}
