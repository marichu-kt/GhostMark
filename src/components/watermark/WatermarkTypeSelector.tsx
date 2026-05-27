import type { WatermarkType } from "../../types/watermark";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Select } from "../ui/Select";

interface WatermarkTypeSelectorProps {
  value: WatermarkType;
  onChange: (type: WatermarkType) => void;
}

export function WatermarkTypeSelector({ value, onChange }: WatermarkTypeSelectorProps) {
  const { t } = useTranslation();

  return (
    <Select
      label={t("watermark.type")}
      value={value}
      onChange={(event) => onChange(event.target.value as WatermarkType)}
      options={[
        { value: "text", label: t("watermark.text") },
        { value: "image", label: t("watermark.image") },
        { value: "pattern", label: t("watermark.pattern") },
        { value: "classification-banner", label: t("watermark.classification") },
        { value: "seal", label: t("watermark.seal") },
      ]}
    />
  );
}
