import { Maximize2, Minus, Plus } from "lucide-react";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitWidth: () => void;
}

export function ZoomControls({ zoom, onZoomChange, onFitWidth }: ZoomControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant="quiet"
        aria-label={t("actions.zoomOut")}
        onClick={() => onZoomChange(Math.max(0.35, Number((zoom - 0.1).toFixed(2))))}
      >
        <Minus size={16} aria-hidden="true" />
      </Button>
      <span className="w-14 text-center text-xs tabular-nums text-steel-200">
        {Math.round(zoom * 100)}%
      </span>
      <Button
        size="icon"
        variant="quiet"
        aria-label={t("actions.zoomIn")}
        onClick={() => onZoomChange(Math.min(2.5, Number((zoom + 0.1).toFixed(2))))}
      >
        <Plus size={16} aria-hidden="true" />
      </Button>
      <Button size="icon" variant="quiet" aria-label={t("actions.fitWidth")} onClick={onFitWidth}>
        <Maximize2 size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}
