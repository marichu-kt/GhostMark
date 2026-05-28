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
  onChange: (config: WatermarkConfig) => void;
}

export function WatermarkDesigner({
  config,
  totalPages,
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

  const pageRuleLabel = {
    all: t("pages.all"),
    first: t("pages.first"),
    last: t("pages.last"),
    odd: t("pages.odd"),
    even: t("pages.even"),
    range: t("pages.range"),
    specific: t("pages.specific"),
    exclude: t("pages.exclude"),
  }[config.pages.mode];
  const showPosition = config.type === "text" || config.type === "seal" || config.type === "image";
  const showRotation = config.type === "text" || config.type === "pattern" || config.type === "image";

  return (
    <>
      <WatermarkTypeSelector value={config.type} onChange={setType} />
      <PresetSelector onApply={patchConfig} />

      <FieldGroup title={t("watermark.basic")}>
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
            {!config.imageData ? (
              <p className="text-xs leading-5 text-steel-300">{t("validation.uploadImage")}</p>
            ) : null}
          </>
        ) : null}

        {showPosition ? (
          <Select
            label={t("watermark.position")}
            value={config.positionPreset}
            onChange={(event) => patchConfig({ positionPreset: event.target.value as PositionPreset })}
            options={positionOptions}
          />
        ) : null}
        {config.type === "text" ? (
          <Slider
            label={t("watermark.fontSize")}
            min={10}
            max={140}
            value={config.fontSize}
            displayValue={`${config.fontSize}px`}
            onChange={(fontSize) => patchConfig({ fontSize })}
          />
        ) : null}
        {config.type === "image" ? (
          <Slider
            label={t("watermark.scale")}
            min={0.05}
            max={1.5}
            step={0.05}
            value={config.scale}
            displayValue={`${Math.round(config.scale * 100)}%`}
            onChange={(scale) => patchConfig({ scale })}
          />
        ) : null}
        <Slider
          label={t("watermark.opacity")}
          min={0.02}
          max={1}
          step={0.01}
          value={config.opacity}
          displayValue={`${Math.round(config.opacity * 100)}%`}
          onChange={(opacity) => patchConfig({ opacity })}
        />
        {showRotation ? (
          <Slider
            label={t("watermark.rotation")}
            min={-90}
            max={90}
            value={config.rotation}
            displayValue={`${config.rotation}°`}
            onChange={(rotation) => patchConfig({ rotation })}
          />
        ) : null}
        {config.type === "text" ? (
          <Input
            label={t("watermark.color")}
            type="color"
            value={config.color}
            onChange={(event) => patchConfig({ color: event.target.value })}
          />
        ) : null}
        {config.type === "pattern" ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm">
            <span className="text-steel-400">{t("watermark.spacing")}</span>
            <span className="font-medium text-white">
              {config.patternSpacingX} x {config.patternSpacingY}
            </span>
          </div>
        ) : null}
      </FieldGroup>

      <Collapsible title={`${t("pages.label")}: ${pageRuleLabel}`}>
        <PageRulesPanel
          value={config.pages}
          totalPages={totalPages}
          onChange={(pages: PageRuleConfig) => patchConfig({ pages })}
        />
      </Collapsible>

      <Collapsible title={t("watermark.advanced")}>
        {config.type === "pattern" ? (
          <>
            <Slider
              label={t("watermark.fontSize")}
              min={10}
              max={140}
              value={config.fontSize}
              displayValue={`${config.fontSize}px`}
              onChange={(fontSize) => patchConfig({ fontSize })}
            />
            <Input
              label={t("watermark.color")}
              type="color"
              value={config.color}
              onChange={(event) => patchConfig({ color: event.target.value })}
            />
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
          <>
            <Slider
              label={t("watermark.fontSize")}
              min={10}
              max={32}
              value={config.fontSize}
              displayValue={`${config.fontSize}px`}
              onChange={(fontSize) => patchConfig({ fontSize })}
            />
            <Slider
              label={t("watermark.bannerMargin")}
              min={0}
              max={72}
              value={config.bannerMargin}
              onChange={(bannerMargin) => patchConfig({ bannerMargin })}
            />
          </>
        ) : null}

        {config.type === "seal" ? (
          <>
            <Slider
              label={t("watermark.rotation")}
              min={-25}
              max={25}
              value={config.rotation}
              displayValue={`${config.rotation}°`}
              onChange={(rotation) => patchConfig({ rotation })}
            />
            <Input
              label={t("watermark.color")}
              type="color"
              value={config.color}
              onChange={(event) => patchConfig({ color: event.target.value })}
            />
            <Slider
              label={t("watermark.sealBorder")}
              min={1}
              max={8}
              value={config.sealBorderThickness}
              onChange={(sealBorderThickness) => patchConfig({ sealBorderThickness })}
            />
          </>
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
