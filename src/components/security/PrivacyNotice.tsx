import { useTranslation } from "../../features/i18n/useTranslation";

export function PrivacyNotice() {
  const { t } = useTranslation();

  return (
    <details className="rounded-md border border-graphite-700 bg-graphite-950/70">
      <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-white">
        {t("security.privacyNoticeTitle")}
      </summary>
      <p className="border-t border-graphite-700 px-3 py-3 text-xs leading-5 text-steel-300">
        {t("app.honestPrivacy")}
      </p>
    </details>
  );
}
