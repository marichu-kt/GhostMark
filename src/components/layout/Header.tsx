import { Download, ShieldCheck } from "lucide-react";
import { useAppSettings } from "../../app/AppProviders";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { LanguageSelector } from "../language/LanguageSelector";
import { BrandMark } from "../brand/BrandMark";

interface HeaderProps {
  fileName?: string;
  canExport: boolean;
  hasDocument: boolean;
  onExport: () => void;
}

export function Header({ fileName, canExport, hasDocument, onExport }: HeaderProps) {
  const { classifiedMode } = useAppSettings();
  const { t } = useTranslation();

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#080d14]/95 px-4 shadow-[0_1px_0_rgba(255,255,255,0.04)] sm:px-6">
      <div className="flex min-w-0 items-center gap-3 lg:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark variant="header" showText />
          {fileName ? (
            <>
              <div className="hidden min-w-0 sm:block">
                <div className="h-8 border-l border-graphite-700" aria-hidden="true" />
              </div>
              <div className="hidden min-w-0 md:block">
                <div className="max-w-48 truncate text-sm text-steel-200 xl:max-w-96">{fileName}</div>
              </div>
            </>
          ) : null}
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <Badge tone="safe">
            <ShieldCheck size={14} aria-hidden="true" />
            {t("badges.localMode")}
          </Badge>
          <Badge tone="neutral">{t("privacy.noUpload")}</Badge>
          {classifiedMode ? <Badge tone="warning">{t("badges.classifiedMode")}</Badge> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <LanguageSelector />
        {hasDocument ? (
          <Button
            variant="primary"
            size="sm"
            onClick={onExport}
            disabled={!canExport}
            aria-label={t("actions.exportPdf")}
          >
            <Download size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{t("actions.exportPdf")}</span>
          </Button>
        ) : null}
      </div>
    </header>
  );
}
