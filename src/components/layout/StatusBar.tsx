import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "../../features/i18n/useTranslation";

export function StatusBar() {
  const { t } = useTranslation();
  const items = [
    t("badges.localMode"),
    t("privacy.noUpload"),
    t("privacy.noTracking"),
  ];

  return (
    <footer className="flex min-h-8 flex-wrap items-center gap-x-5 gap-y-1 border-t border-graphite-700 bg-graphite-950 px-4 text-xs text-steel-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      {items.map((item) => (
        <span key={item} className="inline-flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-local-500" aria-hidden="true" />
          {item}
        </span>
      ))}
    </footer>
  );
}
