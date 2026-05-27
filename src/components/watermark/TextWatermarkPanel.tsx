import type { WatermarkConfig, WatermarkLayer, PositionPreset } from "../../types/watermark";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";
import { FieldGroup } from "../ui/FieldGroup";
import { Input } from "../ui/Input";
import { Notice } from "../ui/Notice";
import { Select } from "../ui/Select";
import { Slider } from "../ui/Slider";
import { layerOptions, positionPresets } from "./sharedOptions";

interface TextWatermarkPanelProps {
  config: WatermarkConfig;
  onChange: (patch: Partial<WatermarkConfig>) => void;
  onReset: () => void;
}

export function TextWatermarkPanel({ config, onChange, onReset }: TextWatermarkPanelProps) {
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
        min={12}
        max={140}
        value={config.fontSize}
        onChange={(fontSize) => onChange({ fontSize })}
      />
      <Input
        label={t("watermark.color")}
        type="color"
        value={config.color}
        onChange={(event) => onChange({ color: event.target.value })}
      />
      <Slider
        label={t("watermark.opacity")}
        min={0.02}
        max={1}
        step={0.01}
        value={config.opacity}
        displayValue={`${Math.round(config.opacity * 100)}%`}
        onChange={(opacity) => onChange({ opacity })}
      />
      <Slider
        label={t("watermark.rotation")}
        min={-90}
        max={90}
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
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t("watermark.customX")}
          type="number"
          value={config.x}
          onChange={(event) => onChange({ x: Number(event.target.value) })}
        />
        <Input
          label={t("watermark.customY")}
          type="number"
          value={config.y}
          onChange={(event) => onChange({ y: Number(event.target.value) })}
        />
      </div>
      <Select
        label={t("watermark.layer")}
        value={config.layer}
        onChange={(event) => onChange({ layer: event.target.value as WatermarkLayer })}
        helpText={t("watermark.layerTodo")}
        options={layerOptions.map((option) => ({
          value: option.value,
          label: t(option.labelKey),
          disabled: option.disabled,
        }))}
      />
      <Notice>{t("watermark.layerTodo")}</Notice>
      <Button variant="quiet" onClick={onReset}>
        {t("actions.reset")}
      </Button>
    </FieldGroup>
  );
}
