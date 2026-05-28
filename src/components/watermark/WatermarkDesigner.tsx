import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, ImagePlus, Plus, Trash2 } from "lucide-react";
import type {
  DocumentLayer,
  LayerType,
  PageRuleConfig,
  PositionPreset,
  RedactionRectangle,
  WatermarkLayer,
} from "../../types/watermark";
import { findRedactionMatches } from "../../features/pdf/redactionSearch";
import type { TranslationKey } from "../../features/i18n/i18n";
import { createLayerForType } from "../../features/watermark/defaults";
import { duplicateLayer, getDefaultLayerName, getLayerDisplayName } from "../../features/watermark/layers";
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
import { PresetSelector } from "./PresetSelector";
import { layerOptions, positionPresets } from "./sharedOptions";

interface WatermarkDesignerProps {
  layers: DocumentLayer[];
  selectedLayerId: string | null;
  totalPages: number;
  currentPage: number;
  pdfBytes?: Uint8Array;
  onChange: (layers: DocumentLayer[]) => void;
  onSelectedLayerChange: (layerId: string | null) => void;
}

const layerTypes: LayerType[] = ["text", "image", "pattern", "classification-banner", "seal", "redaction"];

function getLayerTypeTranslationKey(type: LayerType): TranslationKey {
  switch (type) {
    case "image":
      return "layers.image";
    case "pattern":
      return "layers.pattern";
    case "classification-banner":
      return "layers.banner";
    case "seal":
      return "layers.seal";
    case "redaction":
      return "layers.redaction";
    default:
      return "layers.text";
  }
}

export function WatermarkDesigner({
  layers,
  selectedLayerId,
  totalPages,
  currentPage,
  pdfBytes,
  onChange,
  onSelectedLayerChange,
}: WatermarkDesignerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const { t } = useTranslation();
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? layers[0] ?? null;

  function replaceLayers(nextLayers: DocumentLayer[]) {
    onChange(nextLayers);
  }

  function updateLayer(layerId: string, patch: Partial<DocumentLayer>) {
    replaceLayers(layers.map((layer) => (layer.id === layerId ? { ...layer, ...patch } : layer)));
  }

  function addLayer(type: LayerType) {
    const layer = createLayerForType(type, currentPage);
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

  function addRectangle() {
    if (!selectedLayer) {
      return;
    }

    const rectangle: RedactionRectangle = {
      id: crypto.randomUUID(),
      page: currentPage,
      x: 72,
      y: 640,
      width: 180,
      height: 36,
    };

    patchSelectedLayer({ redactionRectangles: [...selectedLayer.redactionRectangles, rectangle] });
  }

  function updateRectangle(rectangleId: string, patch: Partial<RedactionRectangle>) {
    if (!selectedLayer) {
      return;
    }

    patchSelectedLayer({
      redactionRectangles: selectedLayer.redactionRectangles.map((rectangle) =>
        rectangle.id === rectangleId ? { ...rectangle, ...patch } : rectangle,
      ),
    });
  }

  function removeRectangle(rectangleId: string) {
    if (!selectedLayer) {
      return;
    }

    patchSelectedLayer({
      redactionRectangles: selectedLayer.redactionRectangles.filter((rectangle) => rectangle.id !== rectangleId),
    });
  }

  async function handleFindMatches() {
    if (!selectedLayer || !pdfBytes || !selectedLayer.redactionSearchText.trim()) {
      return;
    }

    setSearching(true);
    setSearchResult(null);

    try {
      const rectangles = await findRedactionMatches(pdfBytes, {
        query: selectedLayer.redactionSearchText,
        caseSensitive: selectedLayer.redactionCaseSensitive,
      });
      patchSelectedLayer({ redactionRectangles: [...selectedLayer.redactionRectangles, ...rectangles] });
      setSearchResult(t("redaction.matchesFound", { count: rectangles.length }));
    } catch {
      setSearchResult(t("redaction.matchesFailed"));
    } finally {
      setSearching(false);
    }
  }

  const positionOptions = positionPresets.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  const pageRuleLabel = selectedLayer
    ? {
        all: t("pages.all"),
        first: t("pages.first"),
        last: t("pages.last"),
        odd: t("pages.odd"),
        even: t("pages.even"),
        range: t("pages.range"),
        specific: t("pages.specific"),
        exclude: t("pages.exclude"),
      }[selectedLayer.pages.mode]
    : t("pages.all");

  return (
    <>
      <FieldGroup title={t("layers.title")}>
        <div className="grid grid-cols-3 gap-2">
          {layerTypes.map((type) => (
            <Button key={type} variant="quiet" size="sm" onClick={() => addLayer(type)}>
              <Plus size={14} aria-hidden="true" />
              {t(getLayerTypeTranslationKey(type))}
            </Button>
          ))}
        </div>

        {layers.length === 0 ? (
          <div className="rounded-md border border-graphite-700 bg-graphite-950 p-3 text-sm text-steel-300">
            {t("layers.noLayers")}
          </div>
        ) : (
          <div className="grid gap-2">
            {layers.map((layer, index) => {
              const selected = selectedLayer?.id === layer.id;

              return (
                <div
                  key={layer.id}
                  className={`grid gap-2 rounded-md border p-2 ${
                    selected ? "border-brand-red bg-graphite-800" : "border-graphite-700 bg-graphite-950"
                  }`}
                >
                  <div className="flex items-center gap-2">
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
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="quiet"
                      aria-label={t("layers.moveUp")}
                      disabled={index === 0}
                      onClick={() => moveLayer(layer.id, -1)}
                    >
                      <ArrowUp size={14} aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="quiet"
                      aria-label={t("layers.moveDown")}
                      disabled={index === layers.length - 1}
                      onClick={() => moveLayer(layer.id, 1)}
                    >
                      <ArrowDown size={14} aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="quiet"
                      aria-label={t("layers.duplicate")}
                      onClick={() => duplicateSelectedLayer(layer)}
                    >
                      <Copy size={14} aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="quiet"
                      aria-label={t("layers.delete")}
                      onClick={() => removeLayer(layer.id)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FieldGroup>

      {selectedLayer ? (
        <>
          <FieldGroup title={t("layers.selected")}>
            <Input
              label={t("layers.name")}
              value={selectedLayer.name}
              onChange={(event) => patchSelectedLayer({ name: event.target.value })}
            />

            {selectedLayer.type !== "redaction" ? (
              <PresetSelector
                onApply={(patch) =>
                  patchSelectedLayer({
                    ...patch,
                    name: patch.type ? getDefaultLayerName(patch.type) : selectedLayer.name,
                  })
                }
              />
            ) : null}

            {selectedLayer.type === "text" || selectedLayer.type === "pattern" ? (
              <Input
                label={t("watermark.textValue")}
                value={selectedLayer.text}
                error={!selectedLayer.text.trim() ? t("validation.addWatermarkText") : undefined}
                onChange={(event) => patchSelectedLayer({ text: event.target.value })}
              />
            ) : null}

            {selectedLayer.type === "classification-banner" ? (
              <>
                <Input
                  label={t("watermark.classificationText")}
                  value={selectedLayer.classificationText}
                  error={!selectedLayer.classificationText.trim() ? t("validation.addWatermarkText") : undefined}
                  onChange={(event) =>
                    patchSelectedLayer({ classificationText: event.target.value, text: event.target.value })
                  }
                />
                <Toggle
                  label={t("watermark.topBanner")}
                  checked={selectedLayer.bannerEnabledTop}
                  onChange={(enabled) => patchSelectedLayer({ bannerEnabledTop: enabled, classificationTop: enabled })}
                />
                <Toggle
                  label={t("watermark.bottomBanner")}
                  checked={selectedLayer.bannerEnabledBottom}
                  onChange={(enabled) =>
                    patchSelectedLayer({ bannerEnabledBottom: enabled, classificationBottom: enabled })
                  }
                />
              </>
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

            {selectedLayer.type === "redaction" ? (
              <>
                <p className="text-xs leading-5 text-steel-300">{t("redaction.flattened")}</p>
                <Button variant="secondary" onClick={addRectangle}>
                  <Plus size={16} aria-hidden="true" />
                  {t("redaction.addRectangle")}
                </Button>
                <Input
                  label={t("redaction.findText")}
                  value={selectedLayer.redactionSearchText}
                  onChange={(event) => patchSelectedLayer({ redactionSearchText: event.target.value })}
                />
                <Button
                  variant="secondary"
                  disabled={searching || !selectedLayer.redactionSearchText.trim()}
                  onClick={() => void handleFindMatches()}
                >
                  {searching ? t("preview.loading") : t("redaction.findMatches")}
                </Button>
                {searchResult ? <p className="text-xs leading-5 text-steel-300">{searchResult}</p> : null}
              </>
            ) : null}

            {selectedLayer.type === "text" || selectedLayer.type === "seal" || selectedLayer.type === "image" ? (
              <Select
                label={t("watermark.position")}
                value={selectedLayer.positionPreset}
                onChange={(event) => patchSelectedLayer({ positionPreset: event.target.value as PositionPreset })}
                options={positionOptions}
              />
            ) : null}

            {selectedLayer.type === "text" ? (
              <Slider
                label={t("watermark.fontSize")}
                min={10}
                max={140}
                value={selectedLayer.fontSize}
                displayValue={`${selectedLayer.fontSize}px`}
                onChange={(fontSize) => patchSelectedLayer({ fontSize })}
              />
            ) : null}

            {selectedLayer.type === "image" ? (
              <Slider
                label={t("watermark.scale")}
                min={0.05}
                max={1.5}
                step={0.05}
                value={selectedLayer.scale}
                displayValue={`${Math.round(selectedLayer.scale * 100)}%`}
                onChange={(scale) => patchSelectedLayer({ scale })}
              />
            ) : null}

            {selectedLayer.type !== "redaction" ? (
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

            {selectedLayer.type === "text" || selectedLayer.type === "pattern" || selectedLayer.type === "image" ? (
              <Slider
                label={t("watermark.rotation")}
                min={-90}
                max={90}
                value={selectedLayer.rotation}
                displayValue={`${selectedLayer.rotation}°`}
                onChange={(rotation) => patchSelectedLayer({ rotation })}
              />
            ) : null}

            {selectedLayer.type === "text" ? (
              <Input
                label={t("watermark.color")}
                type="color"
                value={selectedLayer.color}
                onChange={(event) => patchSelectedLayer({ color: event.target.value })}
              />
            ) : null}

            {selectedLayer.type === "pattern" ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm">
                <span className="text-steel-400">{t("watermark.spacing")}</span>
                <span className="font-medium text-white">
                  {selectedLayer.patternSpacingX} x {selectedLayer.patternSpacingY}
                </span>
              </div>
            ) : null}
          </FieldGroup>

          {selectedLayer.type === "redaction" ? (
            <Collapsible title={`${t("redaction.rectangles")}: ${selectedLayer.redactionRectangles.length}`} defaultOpen>
              <div className="grid gap-3">
                {selectedLayer.redactionRectangles.map((rectangle, index) => (
                  <div key={rectangle.id} className="grid gap-3 rounded-md border border-graphite-700 bg-graphite-950 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white">
                        {t("redaction.blackout")} {index + 1}
                      </span>
                      <Button size="icon" variant="quiet" aria-label={t("layers.delete")} onClick={() => removeRectangle(rectangle.id)}>
                        <Trash2 size={14} aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label={t("preview.page")}
                        type="number"
                        min={1}
                        max={totalPages}
                        value={rectangle.page}
                        onChange={(event) =>
                          updateRectangle(rectangle.id, {
                            page: Math.min(totalPages, Math.max(1, Number(event.target.value))),
                          })
                        }
                      />
                      <Input
                        label={t("watermark.customX")}
                        type="number"
                        value={rectangle.x}
                        onChange={(event) => updateRectangle(rectangle.id, { x: Number(event.target.value) })}
                      />
                      <Input
                        label={t("watermark.customY")}
                        type="number"
                        value={rectangle.y}
                        onChange={(event) => updateRectangle(rectangle.id, { y: Number(event.target.value) })}
                      />
                      <Input
                        label={t("redaction.width")}
                        type="number"
                        value={rectangle.width}
                        onChange={(event) =>
                          updateRectangle(rectangle.id, { width: Math.max(1, Number(event.target.value)) })
                        }
                      />
                      <Input
                        label={t("redaction.height")}
                        type="number"
                        value={rectangle.height}
                        onChange={(event) =>
                          updateRectangle(rectangle.id, { height: Math.max(1, Number(event.target.value)) })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Collapsible>
          ) : null}

          <Collapsible title={`${t("pages.label")}: ${pageRuleLabel}`}>
            <PageRulesPanel
              value={selectedLayer.pages}
              totalPages={totalPages}
              onChange={(pages: PageRuleConfig) => patchSelectedLayer({ pages })}
            />
          </Collapsible>

          <Collapsible title={t("watermark.advanced")}>
            {selectedLayer.type === "redaction" ? (
              <Toggle
                label={t("redaction.caseSensitive")}
                checked={selectedLayer.redactionCaseSensitive}
                onChange={(redactionCaseSensitive) => patchSelectedLayer({ redactionCaseSensitive })}
              />
            ) : null}

            {selectedLayer.type === "pattern" ? (
              <>
                <Slider
                  label={t("watermark.fontSize")}
                  min={10}
                  max={140}
                  value={selectedLayer.fontSize}
                  displayValue={`${selectedLayer.fontSize}px`}
                  onChange={(fontSize) => patchSelectedLayer({ fontSize })}
                />
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

            {selectedLayer.type === "classification-banner" ? (
              <>
                <Slider
                  label={t("watermark.fontSize")}
                  min={10}
                  max={32}
                  value={selectedLayer.fontSize}
                  displayValue={`${selectedLayer.fontSize}px`}
                  onChange={(fontSize) => patchSelectedLayer({ fontSize })}
                />
                <Slider
                  label={t("watermark.bannerMargin")}
                  min={0}
                  max={72}
                  value={selectedLayer.bannerMargin}
                  onChange={(bannerMargin) => patchSelectedLayer({ bannerMargin })}
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
                <Slider
                  label={t("watermark.rotation")}
                  min={-25}
                  max={25}
                  value={selectedLayer.rotation}
                  displayValue={`${selectedLayer.rotation}°`}
                  onChange={(rotation) => patchSelectedLayer({ rotation })}
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

            {selectedLayer.type !== "classification-banner" && selectedLayer.type !== "redaction" ? (
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
