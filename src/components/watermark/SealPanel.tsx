import type { PositionPreset, WatermarkConfig } from "../../types/watermark";
import { useTranslation } from "../../features/i18n/useTranslation";
import { FieldGroup } from "../ui/FieldGroup";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Slider } from "../ui/Slider";
import { Toggle } from "../ui/Toggle";
import { positionPresets } from "./sharedOptions";

interface SealPanelProps {
  config: WatermarkConfig;
  onChange: (patch: Partial<WatermarkConfig>) => void;
}

export function SealPanel({ config, onChange }: SealPanelProps) {
  const { t } = useTranslation();

  return (
    <FieldGroup title={t("watermark.settings")}>
      <Input
        label={t("watermark.sealTitle")}
        value={config.sealTitle}
        onChange={(event) => onChange({ sealTitle: event.target.value })}
      />
      <Input
        label={t("watermark.sealSubtitle")}
        value={config.sealSubtitle}
        onChange={(event) => onChange({ sealSubtitle: event.target.value })}
      />
      <Toggle
        label={t("watermark.sealShowDate")}
        checked={config.sealShowDate}
        onChange={(sealShowDate) => onChange({ sealShowDate })}
      />
      <Slider
        label={t("watermark.sealBorder")}
        min={1}
        max={8}
        value={config.sealBorderThickness}
        onChange={(sealBorderThickness) => onChange({ sealBorderThickness })}
      />
      <Slider
        label={t("watermark.opacity")}
        min={0.1}
        max={1}
        step={0.01}
        value={config.opacity}
        displayValue={`${Math.round(config.opacity * 100)}%`}
        onChange={(opacity) => onChange({ opacity })}
      />
      <Slider
        label={t("watermark.rotation")}
        min={-25}
        max={25}
        value={config.rotation}
        displayValue={`${config.rotation}°`}
        onChange={(rotation) => onChange({ rotation })}
      />
      <Select
        label={t("watermark.position")}
        value={config.positionPreset}
        onChange={(event) => onChange({ positionPreset: event.target.value as PositionPreset })}
        options={positionPresets.map((option) => ({
          value: option.value,
          label: t(option.labelKey),
        }))}
      />
    </FieldGroup>
  );
}
