import type { WatermarkConfig } from "../../types/watermark";
import { useTranslation } from "../../features/i18n/useTranslation";
import { FieldGroup } from "../ui/FieldGroup";
import { Input } from "../ui/Input";
import { Slider } from "../ui/Slider";
import { Toggle } from "../ui/Toggle";

interface ClassificationBannerPanelProps {
  config: WatermarkConfig;
  onChange: (patch: Partial<WatermarkConfig>) => void;
}

export function ClassificationBannerPanel({ config, onChange }: ClassificationBannerPanelProps) {
  const { t } = useTranslation();

  return (
    <FieldGroup title={t("watermark.settings")}>
      <Toggle
        label={t("watermark.topBanner")}
        checked={config.bannerEnabledTop}
        onChange={(enabled) => onChange({ bannerEnabledTop: enabled, classificationTop: enabled })}
      />
      <Toggle
        label={t("watermark.bottomBanner")}
        checked={config.bannerEnabledBottom}
        onChange={(enabled) =>
          onChange({ bannerEnabledBottom: enabled, classificationBottom: enabled })
        }
      />
      <Input
        label={t("watermark.classificationText")}
        value={config.classificationText}
        onChange={(event) =>
          onChange({ classificationText: event.target.value, text: event.target.value })
        }
      />
      <Slider
        label={t("watermark.fontSize")}
        min={10}
        max={32}
        value={config.fontSize}
        onChange={(fontSize) => onChange({ fontSize })}
      />
      <Slider
        label={t("watermark.bannerMargin")}
        min={0}
        max={72}
        value={config.bannerMargin}
        onChange={(bannerMargin) => onChange({ bannerMargin })}
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
    </FieldGroup>
  );
}
