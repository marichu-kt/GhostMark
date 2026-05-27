import type { WatermarkConfig } from "../../types/watermark";
import { useTranslation } from "../../features/i18n/useTranslation";
import { FieldGroup } from "../ui/FieldGroup";
import { Input } from "../ui/Input";
import { Slider } from "../ui/Slider";
import { Toggle } from "../ui/Toggle";

interface PatternWatermarkPanelProps {
  config: WatermarkConfig;
  onChange: (patch: Partial<WatermarkConfig>) => void;
}

export function PatternWatermarkPanel({ config, onChange }: PatternWatermarkPanelProps) {
  const { t } = useTranslation();

  return (
    <FieldGroup title={t("watermark.settings")}>
      <Input
        label={t("watermark.textValue")}
        value={config.text}
        onChange={(event) => onChange({ text: event.target.value })}
      />
      <Slider
        label={t("watermark.fontSize")}
        min={10}
        max={96}
        value={config.fontSize}
        onChange={(fontSize) => onChange({ fontSize })}
      />
      <Slider
        label={t("watermark.patternSpacingX")}
        min={80}
        max={420}
        value={config.patternSpacingX}
        onChange={(patternSpacingX) => onChange({ patternSpacingX })}
      />
      <Slider
        label={t("watermark.patternSpacingY")}
        min={80}
        max={360}
        value={config.patternSpacingY}
        onChange={(patternSpacingY) => onChange({ patternSpacingY })}
      />
      <Slider
        label={t("watermark.rotation")}
        min={-90}
        max={90}
        value={config.rotation}
        displayValue={`${config.rotation}°`}
        onChange={(rotation) => onChange({ rotation })}
      />
      <Slider
        label={t("watermark.opacity")}
        min={0.02}
        max={0.6}
        step={0.01}
        value={config.opacity}
        displayValue={`${Math.round(config.opacity * 100)}%`}
        onChange={(opacity) => onChange({ opacity })}
      />
      <Toggle
        label={t("watermark.patternStaggered")}
        checked={config.patternStaggered}
        onChange={(patternStaggered) => onChange({ patternStaggered })}
      />
    </FieldGroup>
  );
}
