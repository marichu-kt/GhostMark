import type { WatermarkConfig } from "../../types/watermark";
import { watermarkPresets } from "../../features/watermark/presets";
import { useTranslation } from "../../features/i18n/useTranslation";
import { FieldGroup } from "../ui/FieldGroup";

interface PresetSelectorProps {
  onApply: (patch: Partial<WatermarkConfig>) => void;
}

export function PresetSelector({ onApply }: PresetSelectorProps) {
  const { t } = useTranslation();

  return (
    <FieldGroup title={t("watermark.presets")}>
      <div className="grid gap-2">
        {watermarkPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="rounded-md border border-graphite-700 bg-graphite-950 p-3 text-left transition-colors hover:border-steel-500 hover:bg-graphite-800"
            onClick={() => onApply(preset.config)}
          >
            <span className="block text-sm font-semibold text-white">{preset.name}</span>
            <span className="mt-1 block text-xs leading-5 text-steel-300">{preset.description}</span>
          </button>
        ))}
      </div>
    </FieldGroup>
  );
}
