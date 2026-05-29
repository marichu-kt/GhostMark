import { Download, Ellipsis, FileUp, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  onImport: () => void;
  onSecurity: () => void;
}

export function Header({ fileName, canExport, hasDocument, onExport, onImport, onSecurity }: HeaderProps) {
  const { classifiedMode } = useAppSettings();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    action();
  }

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#080d14]/95 px-4 shadow-[0_1px_0_rgba(255,255,255,0.04)] sm:px-6">
      <div className="flex min-w-0 items-center gap-3 lg:gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <BrandMark variant="header" />
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
        <div className="hidden items-center gap-2 xl:flex">
          <Badge tone="safe" className="bg-local-700/30 text-[#34d399]">
            <ShieldCheck size={14} aria-hidden="true" />
            {t("badges.localMode")}
          </Badge>
          <Badge tone="neutral" className="border-steel-500/60 bg-[#101728]/80 text-steel-100">
            {t("privacy.noUpload")}
          </Badge>
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
        <div ref={menuRef} className="relative">
          <Button
            variant="quiet"
            size="icon"
            aria-label={t("actions.moreOptions")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Ellipsis size={18} aria-hidden="true" />
          </Button>
          {menuOpen ? (
            <div className="absolute right-0 top-11 z-40 w-52 rounded-lg border border-graphite-700 bg-[#101722]/95 p-1 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
              {hasDocument ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-steel-100 hover:bg-graphite-800"
                  onClick={() => runMenuAction(onImport)}
                >
                  <FileUp size={15} aria-hidden="true" />
                  {t("actions.importPdf")}
                </button>
              ) : null}
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-steel-100 hover:bg-graphite-800"
                onClick={() => runMenuAction(onSecurity)}
              >
                <ShieldCheck size={15} aria-hidden="true" />
                {t("workflow.security")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
