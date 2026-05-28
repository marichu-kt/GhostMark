import type { WatermarkConfig } from "../../types/watermark";
import { watermarkPresets } from "../../features/watermark/presets";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Select } from "../ui/Select";

interface PresetSelectorProps {
  onApply: (patch: Partial<WatermarkConfig>) => void;
}

export function PresetSelector({ onApply }: PresetSelectorProps) {
  const { t } = useTranslation();

  return (
    <Select
      label={t("watermark.presets")}
      value=""
      onChange={(event) => {
        const preset = watermarkPresets.find((item) => item.id === event.target.value);
        if (preset) {
          onApply(preset.config);
        }
      }}
      options={[
        { value: "", label: t("actions.applyPreset") },
        ...watermarkPresets.map((preset) => ({ value: preset.id, label: preset.name })),
      ]}
    />
  );
}
