import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Grid3X3,
  ImagePlus,
  Layers3,
  RectangleHorizontal,
  Stamp,
  Trash2,
  Type,
} from "lucide-react";
import type {
  DocumentLayer,
  LayerType,
  PageRuleConfig,
  WatermarkLayer,
} from "../../types/watermark";
import type { TranslationKey } from "../../features/i18n/i18n";
import { createLayerForType } from "../../features/watermark/defaults";
import { duplicateLayer, getLayerDisplayName } from "../../features/watermark/layers";
import { getLayerListSummary } from "../../features/watermark/validation";
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
import { PositionGridPicker } from "./PositionGridPicker";
import { layerOptions } from "./sharedOptions";

interface WatermarkDesignerProps {
  layers: DocumentLayer[];
  selectedLayerId: string | null;
  totalPages: number;
  onChange: (layers: DocumentLayer[]) => void;
  onSelectedLayerChange: (layerId: string | null) => void;
}

const layerTypes: LayerType[] = ["text", "image", "pattern", "seal", "safelayer", "blackout"];

const layerIcons: Record<LayerType, typeof Type> = {
  text: Type,
  image: ImagePlus,
  pattern: Grid3X3,
  seal: Stamp,
  safelayer: Layers3,
  blackout: RectangleHorizontal,
};

export const SAFELAYER_VISIBLE_INSPECTOR_KEYS = [
  "safelayer.text",
  "watermark.color",
  "pages.moreOptions",
  "watermark.advanced",
] as const;

function getLayerTypeTranslationKey(type: LayerType): TranslationKey {
  switch (type) {
    case "image":
      return "layers.image";
    case "pattern":
      return "layers.pattern";
    case "seal":
      return "layers.seal";
    case "safelayer":
      return "layers.safelayer";
    case "blackout":
      return "layers.blackout";
    default:
      return "layers.text";
  }
}

export function WatermarkDesigner({
  layers,
  selectedLayerId,
  totalPages,
  onChange,
  onSelectedLayerChange,
}: WatermarkDesignerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const { t } = useTranslation();
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? layers[0] ?? null;

  function replaceLayers(nextLayers: DocumentLayer[]) {
    onChange(nextLayers);
  }

  function updateLayer(layerId: string, patch: Partial<DocumentLayer>) {
    replaceLayers(layers.map((layer) => (layer.id === layerId ? { ...layer, ...patch } : layer)));
  }

  function addLayer(type: LayerType) {
    const layer = {
      ...createLayerForType(type),
      name: t(getLayerTypeTranslationKey(type)),
      ...(type === "seal"
        ? {
            sealTitle: t("watermark.sealDefaultReviewed").toUpperCase(),
            sealSubtitle: t("watermark.sealDefaultDocumentControl").toUpperCase(),
          }
        : {}),
    };
    replaceLayers([...layers, layer]);
    onSelectedLayerChange(layer.id);
  }

  function removeLayer(layerId: string) {
    const nextLayers = layers.filter((layer) => layer.id !== layerId);
    replaceLayers(nextLayers);
    onSelectedLayerChange(nextLayers[0]?.id ?? null);
  }

  function duplicateSelectedLayer(layer: DocumentLayer) {
    const nextLayer = duplicateLayer(layer);
    const index = layers.findIndex((item) => item.id === layer.id);
    const nextLayers = [...layers];
    nextLayers.splice(index + 1, 0, nextLayer);
    replaceLayers(nextLayers);
    onSelectedLayerChange(nextLayer.id);
  }

  function moveLayer(layerId: string, direction: -1 | 1) {
    const index = layers.findIndex((layer) => layer.id === layerId);
    const targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || targetIndex >= layers.length) {
      return;
    }

    const nextLayers = [...layers];
    const [layer] = nextLayers.splice(index, 1);
    nextLayers.splice(targetIndex, 0, layer);
    replaceLayers(nextLayers);
  }

  function patchSelectedLayer(patch: Partial<DocumentLayer>) {
    if (!selectedLayer) {
      return;
    }

    updateLayer(selectedLayer.id, patch);
  }

  async function handleImage(file: File | undefined) {
    if (!file || !selectedLayer) {
      return;
    }

    const mimeType = file.type === "image/png" || file.type === "image/jpeg" ? file.type : null;

    if (!mimeType) {
      setImageError(t("watermark.imageError"));
      return;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    patchSelectedLayer({ imageData: bytes, imageMimeType: mimeType });
    setImageError(null);
  }

  function patchBlackoutRect(rectId: string, patch: Partial<DocumentLayer["blackoutRects"][number]>) {
    if (!selectedLayer) {
      return;
    }

    patchSelectedLayer({
      blackoutRects: selectedLayer.blackoutRects.map((rect) =>
        rect.id === rectId ? { ...rect, ...patch } : rect,
      ),
    });
  }

  function removeBlackoutRect(rectId: string) {
    if (!selectedLayer) {
      return;
    }

    patchSelectedLayer({
      blackoutRects: selectedLayer.blackoutRects.filter((rect) => rect.id !== rectId),
    });
  }

  function duplicateBlackoutRect(rectId: string) {
    if (!selectedLayer) {
      return;
    }

    const rect = selectedLayer.blackoutRects.find((item) => item.id === rectId);
    if (!rect) {
      return;
    }

    patchSelectedLayer({
      blackoutRects: [
        ...selectedLayer.blackoutRects,
        { ...rect, id: crypto.randomUUID(), x: rect.x + 12, y: rect.y - 12 },
      ],
    });
  }

  return (
    <>
      <FieldGroup title={t("layers.addWatermark")}>
        <div className="grid min-w-0 grid-cols-2 gap-2">
          {layerTypes.map((type) => {
            const Icon = layerIcons[type];

            return (
              <Button key={type} variant="quiet" size="sm" className="min-w-0 flex-wrap" onClick={() => addLayer(type)}>
                <Icon size={15} aria-hidden="true" />
                <span className="min-w-0 truncate">{t(getLayerTypeTranslationKey(type))}</span>
              </Button>
            );
          })}
        </div>
      </FieldGroup>

      <FieldGroup title={t("layers.title")}>
        {layers.length === 0 ? (
          <div className="rounded-md border border-dashed border-graphite-600 bg-graphite-950/80 p-3 text-sm text-steel-300">
            {t("layers.addFirst")}
          </div>
        ) : (
          <div className="grid min-w-0 gap-2">
            {layers.map((layer, index) => {
              const selected = selectedLayer?.id === layer.id;

              return (
                <div
                  key={layer.id}
                  className={`min-w-0 rounded-md border p-2 transition-colors ${
                    selected ? "border-brand-red bg-graphite-800/90" : "border-graphite-700 bg-graphite-950/80"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-red"
                      aria-label={t("layers.toggleLayer")}
                      checked={layer.enabled}
                      onChange={(event) => updateLayer(layer.id, { enabled: event.target.checked })}
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onSelectedLayerChange(layer.id)}
                    >
                      <span className="block truncate text-sm font-semibold text-white">
                        {getLayerDisplayName(layer)}
                      </span>
                      <span className="block truncate text-xs text-steel-400">{getLayerListSummary(layer)}</span>
                    </button>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="quiet"
                        aria-label={t("layers.moveUp")}
                        disabled={index === 0}
                        onClick={() => moveLayer(layer.id, -1)}
                      >
                        <ArrowUp size={13} aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon"
                        variant="quiet"
                        aria-label={t("layers.moveDown")}
                        disabled={index === layers.length - 1}
                        onClick={() => moveLayer(layer.id, 1)}
                      >
                        <ArrowDown size={13} aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon"
                        variant="quiet"
                        aria-label={t("layers.duplicate")}
                        onClick={() => duplicateSelectedLayer(layer)}
                      >
                        <Copy size={13} aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon"
                        variant="quiet"
                        aria-label={t("layers.delete")}
                        onClick={() => removeLayer(layer.id)}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FieldGroup>

      {selectedLayer ? (
        <>
          <FieldGroup title={t("layers.currentMark")}>
            {selectedLayer.type === "text" || selectedLayer.type === "pattern" || selectedLayer.type === "safelayer" ? (
              <Input
                label={selectedLayer.type === "safelayer" ? t("safelayer.text") : t("watermark.textValue")}
                value={selectedLayer.text}
                error={!selectedLayer.text.trim() ? t("validation.addWatermarkText") : undefined}
                onChange={(event) => patchSelectedLayer({ text: event.target.value })}
              />
            ) : null}

            {selectedLayer.type === "seal" ? (
              <>
                <Input
                  label={t("watermark.sealTitle")}
                  value={selectedLayer.sealTitle}
                  error={!selectedLayer.sealTitle.trim() ? t("validation.addSealTitle") : undefined}
                  onChange={(event) => patchSelectedLayer({ sealTitle: event.target.value })}
                />
                <Input
                  label={t("watermark.sealSubtitle")}
                  value={selectedLayer.sealSubtitle}
                  onChange={(event) => patchSelectedLayer({ sealSubtitle: event.target.value })}
                />
                <Select
                  label={t("watermark.sealStyle")}
                  value={selectedLayer.sealStyle}
                  onChange={(event) =>
                    patchSelectedLayer({ sealStyle: event.target.value as DocumentLayer["sealStyle"] })
                  }
                  options={[
                    { value: "rectangular", label: t("watermark.sealStyleRectangular") },
                    { value: "circular", label: t("watermark.sealStyleCircular") },
                  ]}
                />
              </>
            ) : null}

            {selectedLayer.type === "image" ? (
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
                {!selectedLayer.imageData ? (
                  <p className="text-xs leading-5 text-steel-300">{t("validation.uploadImage")}</p>
                ) : null}
              </>
            ) : null}

            {selectedLayer.type === "blackout" ? (
              <>
                <Notice tone="warning">{t("blackout.flattenWarning")}</Notice>
                <p className="text-xs leading-5 text-steel-300">{t("blackout.drawInstruction")}</p>
                <div className="grid min-w-0 gap-3">
                  {selectedLayer.blackoutRects.map((rect, index) => (
                    <div key={rect.id} className="grid min-w-0 gap-3 rounded-md border border-graphite-700 bg-graphite-950 p-3">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">
                          {t("blackout.rectangle")} {index + 1}
                        </span>
                        <div className="flex shrink-0 gap-1">
                          <Button size="icon" variant="quiet" aria-label={t("layers.duplicate")} onClick={() => duplicateBlackoutRect(rect.id)}>
                            <Copy size={13} aria-hidden="true" />
                          </Button>
                          <Button size="icon" variant="quiet" aria-label={t("blackout.deleteRectangle")} onClick={() => removeBlackoutRect(rect.id)}>
                            <Trash2 size={13} aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid min-w-0 grid-cols-2 gap-3">
                        <Input
                          label={t("blackout.page")}
                          type="number"
                          value={rect.page}
                          onChange={(event) => patchBlackoutRect(rect.id, { page: Number(event.target.value) })}
                        />
                        <Input
                          label={t("watermark.customX")}
                          type="number"
                          value={rect.x}
                          onChange={(event) => patchBlackoutRect(rect.id, { x: Number(event.target.value) })}
                        />
                        <Input
                          label={t("watermark.customY")}
                          type="number"
                          value={rect.y}
                          onChange={(event) => patchBlackoutRect(rect.id, { y: Number(event.target.value) })}
                        />
                        <Input
                          label={t("blackout.width")}
                          type="number"
                          value={rect.width}
                          onChange={(event) => patchBlackoutRect(rect.id, { width: Number(event.target.value) })}
                        />
                        <Input
                          label={t("blackout.height")}
                          type="number"
                          value={rect.height}
                          onChange={(event) => patchBlackoutRect(rect.id, { height: Number(event.target.value) })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {selectedLayer.type === "text" || selectedLayer.type === "seal" || selectedLayer.type === "image" ? (
              <PositionGridPicker
                label={t("watermark.position")}
                value={selectedLayer.positionPreset}
                onChange={(positionPreset) => patchSelectedLayer({ positionPreset })}
              />
            ) : null}

            {selectedLayer.type === "text" || selectedLayer.type === "pattern" ? (
              <Slider
                label={t("watermark.fontSize")}
                min={10}
                max={140}
                value={selectedLayer.fontSize}
                displayValue={`${selectedLayer.fontSize}px`}
                onChange={(fontSize) => patchSelectedLayer({ fontSize })}
              />
            ) : null}

            {selectedLayer.type === "image" || selectedLayer.type === "seal" ? (
              <Slider
                label={t("watermark.scale")}
                min={selectedLayer.type === "seal" ? 0.55 : 0.05}
                max={selectedLayer.type === "seal" ? 1.8 : 1.5}
                step={0.05}
                value={selectedLayer.scale}
                displayValue={`${Math.round(selectedLayer.scale * 100)}%`}
                onChange={(scale) => patchSelectedLayer({ scale })}
              />
            ) : null}

            {selectedLayer.type !== "blackout" && selectedLayer.type !== "safelayer" ? (
              <Slider
                label={t("watermark.opacity")}
                min={0.02}
                max={1}
                step={0.01}
                value={selectedLayer.opacity}
                displayValue={`${Math.round(selectedLayer.opacity * 100)}%`}
                onChange={(opacity) => patchSelectedLayer({ opacity })}
              />
            ) : null}

            {selectedLayer.type === "text" ||
            selectedLayer.type === "pattern" ||
            selectedLayer.type === "image" ||
            selectedLayer.type === "seal" ? (
              <Slider
                label={t("watermark.rotation")}
                min={selectedLayer.type === "seal" ? -30 : -90}
                max={selectedLayer.type === "seal" ? 30 : 90}
                value={selectedLayer.rotation}
                displayValue={`${selectedLayer.rotation}°`}
                onChange={(rotation) => patchSelectedLayer({ rotation })}
              />
            ) : null}

            {selectedLayer.type === "text" || selectedLayer.type === "safelayer" ? (
              <Input
                label={t("watermark.color")}
                type="color"
                value={selectedLayer.color}
                onChange={(event) => patchSelectedLayer({ color: event.target.value })}
              />
            ) : null}
          </FieldGroup>

          <Collapsible title={t("pages.moreOptions")}>
            <PageRulesPanel
              value={selectedLayer.pages}
              totalPages={totalPages}
              onChange={(pages: PageRuleConfig) => patchSelectedLayer({ pages })}
            />
          </Collapsible>

          <Collapsible title={t("watermark.advanced")}>
            {selectedLayer.type === "pattern" ? (
              <>
                <Input
                  label={t("watermark.color")}
                  type="color"
                  value={selectedLayer.color}
                  onChange={(event) => patchSelectedLayer({ color: event.target.value })}
                />
                <Slider
                  label={t("watermark.patternSpacingX")}
                  min={80}
                  max={420}
                  value={selectedLayer.patternSpacingX}
                  onChange={(patternSpacingX) => patchSelectedLayer({ patternSpacingX })}
                />
                <Slider
                  label={t("watermark.patternSpacingY")}
                  min={80}
                  max={360}
                  value={selectedLayer.patternSpacingY}
                  onChange={(patternSpacingY) => patchSelectedLayer({ patternSpacingY })}
                />
                <Toggle
                  label={t("watermark.patternStaggered")}
                  checked={selectedLayer.patternStaggered}
                  onChange={(patternStaggered) => patchSelectedLayer({ patternStaggered })}
                />
              </>
            ) : null}

            {selectedLayer.type === "seal" ? (
              <>
                <Toggle
                  label={t("watermark.sealShowDate")}
                  checked={selectedLayer.sealShowDate}
                  onChange={(sealShowDate) => patchSelectedLayer({ sealShowDate })}
                />
                <Input
                  label={t("watermark.sealDocumentId")}
                  value={selectedLayer.sealDocumentId}
                  onChange={(event) => patchSelectedLayer({ sealDocumentId: event.target.value })}
                />
                <Input
                  label={t("watermark.color")}
                  type="color"
                  value={selectedLayer.color}
                  onChange={(event) => patchSelectedLayer({ color: event.target.value })}
                />
                <Slider
                  label={t("watermark.sealBorder")}
                  min={1}
                  max={8}
                  value={selectedLayer.sealBorderThickness}
                  onChange={(sealBorderThickness) => patchSelectedLayer({ sealBorderThickness })}
                />
              </>
            ) : null}

            {selectedLayer.type !== "blackout" && selectedLayer.type !== "safelayer" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={t("watermark.customX")}
                    type="number"
                    value={selectedLayer.x}
                    onChange={(event) => patchSelectedLayer({ x: Number(event.target.value) })}
                  />
                  <Input
                    label={t("watermark.customY")}
                    type="number"
                    value={selectedLayer.y}
                    onChange={(event) => patchSelectedLayer({ y: Number(event.target.value) })}
                  />
                </div>
                <Select
                  label={t("watermark.layer")}
                  value={selectedLayer.layer}
                  onChange={(event) => patchSelectedLayer({ layer: event.target.value as WatermarkLayer })}
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
      ) : null}
    </>
  );
}
