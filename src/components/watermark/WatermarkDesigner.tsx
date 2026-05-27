import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import type { PageRuleConfig, PositionPreset, WatermarkConfig, WatermarkLayer, WatermarkType } from "../../types/watermark";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";
import { Collapsible } from "../ui/Collapsible";
import { FieldGroup } from "../ui/FieldGroup";
import { Input } from "../ui/Input";
import { Notice } from "../ui/Notice";
import { Select } from "../ui/Select";
import { Slider } from "../ui/Slider";
import { Toggle } from "../ui/Toggle";
import { PageRulesPanel } from "./PageRulesPanel";
import { PresetSelector } from "./PresetSelector";
import { layerOptions, positionPresets } from "./sharedOptions";
import { WatermarkTypeSelector } from "./WatermarkTypeSelector";

interface WatermarkDesignerProps {
  config: WatermarkConfig;
  totalPages: number;
  validationMessage?: string;
  onChange: (config: WatermarkConfig) => void;
}

export function WatermarkDesigner({
  config,
  totalPages,
  validationMessage,
  onChange,
}: WatermarkDesignerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const { t } = useTranslation();

  function patchConfig(patch: Partial<WatermarkConfig>) {
    onChange({ ...config, ...patch });
  }

  function setType(type: WatermarkType) {
    patchConfig({ type });
  }

  async function handleImage(file: File | undefined) {
    if (!file) {
      return;
    }

    const mimeType = file.type === "image/png" || file.type === "image/jpeg" ? file.type : null;

    if (!mimeType) {
      setImageError(t("watermark.imageError"));
      return;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    patchConfig({ imageData: bytes, imageMimeType: mimeType });
    setImageError(null);
  }

  const positionOptions = positionPresets.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  return (
    <>
      <FieldGroup title={t("watermark.basic")}>
        <WatermarkTypeSelector value={config.type} onChange={setType} />
        <PresetSelector onApply={patchConfig} />
        {validationMessage ? <Notice tone="warning">{validationMessage}</Notice> : null}

        {config.type === "text" || config.type === "pattern" ? (
          <Input
            label={t("watermark.textValue")}
            value={config.text}
            error={!config.text.trim() ? t("validation.addWatermarkText") : undefined}
            onChange={(event) => patchConfig({ text: event.target.value })}
          />
        ) : null}

        {config.type === "classification-banner" ? (
          <>
            <Input
              label={t("watermark.classificationText")}
              value={config.classificationText}
              error={!config.classificationText.trim() ? t("validation.addWatermarkText") : undefined}
              onChange={(event) =>
                patchConfig({ classificationText: event.target.value, text: event.target.value })
              }
            />
            <Toggle
              label={t("watermark.topBanner")}
              checked={config.bannerEnabledTop}
              onChange={(enabled) => patchConfig({ bannerEnabledTop: enabled, classificationTop: enabled })}
            />
            <Toggle
              label={t("watermark.bottomBanner")}
              checked={config.bannerEnabledBottom}
              onChange={(enabled) =>
                patchConfig({ bannerEnabledBottom: enabled, classificationBottom: enabled })
              }
            />
          </>
        ) : null}

        {config.type === "seal" ? (
          <>
            <Input
              label={t("watermark.sealTitle")}
              value={config.sealTitle}
              error={!config.sealTitle.trim() ? t("validation.addSealTitle") : undefined}
              onChange={(event) => patchConfig({ sealTitle: event.target.value })}
            />
            <Input
              label={t("watermark.sealSubtitle")}
              value={config.sealSubtitle}
              onChange={(event) => patchConfig({ sealSubtitle: event.target.value })}
            />
            <Toggle
              label={t("watermark.sealShowDate")}
              checked={config.sealShowDate}
              onChange={(sealShowDate) => patchConfig({ sealShowDate })}
            />
          </>
        ) : null}

        {config.type === "image" ? (
          <>
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
            {imageError ? <Notice tone="danger">{imageError}</Notice> : null}
            {!config.imageData ? <Notice>{t("validation.uploadImage")}</Notice> : null}
          </>
        ) : null}
      </FieldGroup>

      <FieldGroup title={t("watermark.positionAndAppearance")}>
        {config.type !== "classification-banner" ? (
          <Select
            label={t("watermark.position")}
            value={config.positionPreset}
            onChange={(event) => patchConfig({ positionPreset: event.target.value as PositionPreset })}
            options={positionOptions}
          />
        ) : null}
        <Slider
          label={config.type === "image" ? t("watermark.scale") : t("watermark.fontSize")}
          min={config.type === "image" ? 0.05 : 10}
          max={config.type === "image" ? 1.5 : config.type === "classification-banner" ? 32 : 140}
          step={config.type === "image" ? 0.05 : 1}
          value={config.type === "image" ? config.scale : config.fontSize}
          displayValue={
            config.type === "image"
              ? `${Math.round(config.scale * 100)}%`
              : `${config.fontSize}px`
          }
          onChange={(value) =>
            config.type === "image" ? patchConfig({ scale: value }) : patchConfig({ fontSize: value })
          }
        />
        <Slider
          label={t("watermark.opacity")}
          min={0.02}
          max={1}
          step={0.01}
          value={config.opacity}
          displayValue={`${Math.round(config.opacity * 100)}%`}
          onChange={(opacity) => patchConfig({ opacity })}
        />
        {config.type !== "classification-banner" ? (
          <Slider
            label={t("watermark.rotation")}
            min={config.type === "seal" ? -25 : -90}
            max={config.type === "seal" ? 25 : 90}
            value={config.rotation}
            displayValue={`${config.rotation}°`}
            onChange={(rotation) => patchConfig({ rotation })}
          />
        ) : null}
        {config.type !== "classification-banner" && config.type !== "image" ? (
          <Input
            label={t("watermark.color")}
            type="color"
            value={config.color}
            onChange={(event) => patchConfig({ color: event.target.value })}
          />
        ) : null}
      </FieldGroup>

      <Collapsible title={t("workflow.pageRules")} description={t("pages.defaultAll")}>
        <PageRulesPanel
          value={config.pages}
          totalPages={totalPages}
          onChange={(pages: PageRuleConfig) => patchConfig({ pages })}
        />
      </Collapsible>

      <Collapsible title={t("watermark.advanced")} description={t("watermark.advancedDescription")}>
        {config.type === "pattern" ? (
          <>
            <Slider
              label={t("watermark.patternSpacingX")}
              min={80}
              max={420}
              value={config.patternSpacingX}
              onChange={(patternSpacingX) => patchConfig({ patternSpacingX })}
            />
            <Slider
              label={t("watermark.patternSpacingY")}
              min={80}
              max={360}
              value={config.patternSpacingY}
              onChange={(patternSpacingY) => patchConfig({ patternSpacingY })}
            />
            <Toggle
              label={t("watermark.patternStaggered")}
              checked={config.patternStaggered}
              onChange={(patternStaggered) => patchConfig({ patternStaggered })}
            />
          </>
        ) : null}

        {config.type === "classification-banner" ? (
          <Slider
            label={t("watermark.bannerMargin")}
            min={0}
            max={72}
            value={config.bannerMargin}
            onChange={(bannerMargin) => patchConfig({ bannerMargin })}
          />
        ) : null}

        {config.type === "seal" ? (
          <Slider
            label={t("watermark.sealBorder")}
            min={1}
            max={8}
            value={config.sealBorderThickness}
            onChange={(sealBorderThickness) => patchConfig({ sealBorderThickness })}
          />
        ) : null}

        {config.type !== "classification-banner" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t("watermark.customX")}
                type="number"
                value={config.x}
                onChange={(event) => patchConfig({ x: Number(event.target.value) })}
              />
              <Input
                label={t("watermark.customY")}
                type="number"
                value={config.y}
                onChange={(event) => patchConfig({ y: Number(event.target.value) })}
              />
            </div>
            <Select
              label={t("watermark.layer")}
              value={config.layer}
              onChange={(event) => patchConfig({ layer: event.target.value as WatermarkLayer })}
              helpText={t("watermark.layerTodo")}
              options={layerOptions.map((option) => ({
                value: option.value,
                label: t(option.labelKey),
                disabled: option.disabled,
              }))}
            />
          </>
        ) : null}
      </Collapsible>
    </>
  );
}
