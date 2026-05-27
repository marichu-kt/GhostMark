import { HardDrive, ShieldCheck } from "lucide-react";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";
import { PdfImporter } from "../pdf/PdfImporter";
import type { LoadedPdf } from "../../types/pdf";
import { BrandMark } from "../brand/BrandMark";

interface EmptyStateProps {
  onLoaded: (document: LoadedPdf) => void;
  onOpenSecurity: () => void;
}

export function EmptyState({ onLoaded, onOpenSecurity }: EmptyStateProps) {
  const { t } = useTranslation();
  const highlights = [
    t("privacy.localProcessing"),
    t("privacy.noFileUploads"),
    t("privacy.noAccounts"),
    t("privacy.noAnalytics"),
    t("privacy.noCookies"),
    t("privacy.offlineReady"),
  ];

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-8">
      <div className="relative overflow-hidden rounded-md border border-graphite-700 bg-graphite-900 shadow-panel">
        <div className="absolute right-8 top-6 hidden lg:block" aria-hidden="true">
          <BrandMark variant="watermark" />
        </div>
        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_300px] lg:p-8">
          <div className="grid gap-5">
            <BrandMark variant="hero" />
            <div>
              <h1 className="text-4xl font-semibold tracking-normal text-white">{t("app.name")}</h1>
              <p className="mt-2 text-lg text-steel-100">{t("app.subtitle")}</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-local-500/70 bg-local-700/20 px-3 py-2 text-sm font-medium text-local-100">
                <HardDrive size={16} aria-hidden="true" />
                {t("app.privateMessage")}
              </p>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-steel-300">{t("app.description")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <PdfImporter onLoaded={onLoaded} mode="button" />
              <Button variant="secondary" onClick={onOpenSecurity}>
                <ShieldCheck size={16} aria-hidden="true" />
                {t("actions.openSecurityCenter")}
              </Button>
            </div>
          </div>

          <div className="grid content-start gap-3 rounded-md border border-graphite-700 bg-graphite-950/70 p-4">
            <BrandMark variant="empty" className="mb-1" />
            <div className="grid gap-2">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-steel-100">
                  <ShieldCheck size={16} className="text-local-500" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Notice tone="warning">{t("app.warningSensitive")}</Notice>
      <Notice title={t("security.privacyNoticeTitle")}>{t("app.honestPrivacy")}</Notice>
    </section>
  );
}
