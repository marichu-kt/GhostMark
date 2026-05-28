import { CheckCircle2, Info } from "lucide-react";
import { useTranslation } from "../../features/i18n/useTranslation";

export function PrivacyChecklist() {
  const { t } = useTranslation();
  const statuses = [
    t("security.localProcessing"),
    t("security.networkUpload"),
    t("security.analytics"),
    t("security.cookies"),
    t("security.storage"),
    t("security.external"),
    t("security.offline"),
  ];

  return (
    <section className="grid gap-1.5">
      {statuses.map((status, index) => (
        <div
          key={status}
          className="flex items-center gap-2 rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-steel-100"
        >
          {index === statuses.length - 1 ? (
            <Info size={15} className="text-amberline-300" aria-hidden="true" />
          ) : (
            <CheckCircle2 size={15} className="text-local-500" aria-hidden="true" />
          )}
          <span>{status}</span>
        </div>
      ))}
    </section>
  );
}
