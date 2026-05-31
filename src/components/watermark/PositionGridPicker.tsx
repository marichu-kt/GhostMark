import type { PositionPreset } from "../../types/watermark";
import type { TranslationKey } from "../../features/i18n/i18n";
import { useTranslation } from "../../features/i18n/useTranslation";
import { classNames } from "../ui/classNames";

export interface PositionGridOption {
  value: PositionPreset;
  labelKey: TranslationKey;
}

export const POSITION_GRID_OPTIONS: PositionGridOption[] = [
  { value: "top-left", labelKey: "position.top-left" },
  { value: "top-center", labelKey: "position.top-center" },
  { value: "top-right", labelKey: "position.top-right" },
  { value: "center-left", labelKey: "position.center-left" },
  { value: "center", labelKey: "position.center" },
  { value: "center-right", labelKey: "position.center-right" },
  { value: "bottom-left", labelKey: "position.bottom-left" },
  { value: "bottom-center", labelKey: "position.bottom-center" },
  { value: "bottom-right", labelKey: "position.bottom-right" },
];

interface PositionGridPickerProps {
  value: PositionPreset;
  onChange: (value: PositionPreset) => void;
  label?: string;
  disabled?: boolean;
}

export function PositionGridPicker({
  value,
  onChange,
  label,
  disabled = false,
}: PositionGridPickerProps) {
  const { t } = useTranslation();
  const visibleValue = value === "diagonal-center" ? "center" : value;

  return (
    <fieldset className="grid gap-2 text-sm text-steel-100" disabled={disabled}>
      <legend className="font-medium">{label ?? t("watermark.position")}</legend>
      <div className="grid w-full max-w-[126px] grid-cols-3 gap-1" role="group">
        {POSITION_GRID_OPTIONS.map((option) => {
          const selected = option.value === visibleValue;
          const labelText = t(option.labelKey);

          return (
            <button
              key={option.value}
              type="button"
              aria-label={labelText}
              aria-pressed={selected}
              title={labelText}
              disabled={disabled}
              className={classNames(
                "aspect-square rounded border transition focus:outline-none focus:ring-2 focus:ring-white/85 focus:ring-offset-2 focus:ring-offset-[#10151c]",
                selected
                  ? "border-local-400 bg-local-500/85 shadow-[0_0_0_1px_rgba(52,211,153,0.42),0_0_18px_rgba(52,211,153,0.22)]"
                  : "border-brand-red/60 bg-brand-red/10 hover:border-brand-red hover:bg-brand-red/18",
                disabled && "cursor-not-allowed opacity-50",
              )}
              onClick={() => onChange(option.value)}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
