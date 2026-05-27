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
    <section className="grid gap-2">
      {statuses.map((status, index) => (
        <div
          key={status}
          className="flex items-start gap-2 rounded-md border border-graphite-700 bg-graphite-950 p-3 text-sm text-steel-100"
        >
          {index === statuses.length - 1 ? (
            <Info size={16} className="mt-0.5 text-amberline-300" aria-hidden="true" />
          ) : (
            <CheckCircle2 size={16} className="mt-0.5 text-local-500" aria-hidden="true" />
          )}
          <span>{status}</span>
        </div>
      ))}
    </section>
  );
}
