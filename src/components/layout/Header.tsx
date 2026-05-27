import { Download, ShieldCheck } from "lucide-react";
import { useAppSettings } from "../../app/AppProviders";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { LanguageSelector } from "../language/LanguageSelector";

interface HeaderProps {
  fileName?: string;
  canExport: boolean;
  onExport: () => void;
}

export function Header({ fileName, canExport, onExport }: HeaderProps) {
  const { classifiedMode } = useAppSettings();
  const { t } = useTranslation();

  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b border-graphite-700 bg-graphite-900 px-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md border border-steel-500 bg-graphite-950 text-sm font-bold text-amberline-100">
            GM
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-wide text-white">{t("app.name")}</div>
            <div className="truncate text-xs text-steel-300">
              {fileName ? `${t("header.currentFile")}: ${fileName}` : t("header.noFile")}
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <Badge tone="safe">
            <ShieldCheck size={14} aria-hidden="true" />
            {t("badges.localMode")}
          </Badge>
          {classifiedMode ? <Badge tone="warning">{t("badges.classifiedMode")}</Badge> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <LanguageSelector />
        <Button variant="primary" size="sm" onClick={onExport} disabled={!canExport}>
          <Download size={16} aria-hidden="true" />
          {t("actions.export")}
        </Button>
      </div>
    </header>
  );
}
