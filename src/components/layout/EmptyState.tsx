import { ShieldCheck } from "lucide-react";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";
import { PdfImporter } from "../pdf/PdfImporter";
import type { LoadedPdf } from "../../types/pdf";

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
    <section className="mx-auto grid w-full max-w-4xl gap-8 px-6 py-10">
      <div className="grid gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-normal text-white">{t("app.name")}</h1>
          <p className="mt-2 text-lg text-steel-100">{t("app.subtitle")}</p>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-steel-300">{t("app.description")}</p>
      </div>

      <div className="grid gap-4 rounded-md border border-graphite-700 bg-graphite-900 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-steel-100">
              <ShieldCheck size={16} className="text-local-500" aria-hidden="true" />
              {item}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PdfImporter onLoaded={onLoaded} mode="button" />
          <Button variant="secondary" onClick={onOpenSecurity}>
            <ShieldCheck size={16} aria-hidden="true" />
            {t("actions.openSecurityCenter")}
          </Button>
        </div>
      </div>

      <Notice tone="warning">{t("app.warningSensitive")}</Notice>
      <Notice title={t("security.privacyNoticeTitle")}>{t("app.honestPrivacy")}</Notice>
    </section>
  );
}
