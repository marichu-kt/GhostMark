import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import type { PositionPreset, WatermarkConfig } from "../../types/watermark";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";
import { FieldGroup } from "../ui/FieldGroup";
import { Notice } from "../ui/Notice";
import { Select } from "../ui/Select";
import { Slider } from "../ui/Slider";
import { positionPresets } from "./sharedOptions";

interface ImageWatermarkPanelProps {
  config: WatermarkConfig;
  onChange: (patch: Partial<WatermarkConfig>) => void;
}

export function ImageWatermarkPanel({ config, onChange }: ImageWatermarkPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  async function handleImage(file: File | undefined) {
    if (!file) {
      return;
    }

    const mimeType = file.type === "image/png" || file.type === "image/jpeg" ? file.type : null;

    if (!mimeType) {
      setError(t("watermark.imageError"));
      return;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    onChange({ imageData: bytes, imageMimeType: mimeType });
    setError(null);
  }

  return (
    <FieldGroup title={t("watermark.settings")}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        onChange={(event) => void handleImage(event.target.files?.[0])}
      />
      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
        <ImagePlus size={16} aria-hidden="true" />
        {t("watermark.uploadImage")}
      </Button>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Notice tone={config.imageData ? "success" : "info"}>{t("watermark.imageReady")}</Notice>
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
        label={t("watermark.scale")}
        min={0.05}
        max={1.5}
        step={0.05}
        value={config.scale}
        displayValue={`${Math.round(config.scale * 100)}%`}
        onChange={(scale) => onChange({ scale })}
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
    </FieldGroup>
  );
}
