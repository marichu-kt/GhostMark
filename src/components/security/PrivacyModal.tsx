import { BarChart3, CloudOff, ShieldCheck, UserRoundX } from "lucide-react";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

export function PrivacyModal({ open, onClose }: PrivacyModalProps) {
  const { t } = useTranslation();
  const items = [
    { icon: ShieldCheck, label: t("privacy.processedLocally") },
    { icon: CloudOff, label: t("privacy.noFileUploads") },
    { icon: BarChart3, label: t("privacy.noAnalytics") },
    { icon: UserRoundX, label: t("privacy.noAccounts") },
  ];

  return (
    <Modal open={open} title={t("actions.privacy")} onClose={onClose}>
      <div className="grid gap-5">
        <p className="text-sm leading-6 text-steel-200">{t("privacy.modalSummary")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg border border-graphite-700 bg-graphite-950/70 p-3"
              >
                <span className="grid h-9 w-9 place-items-center rounded-md border border-brand-red/35 bg-brand-red/10 text-brand-red">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-white">{item.label}</span>
              </div>
            );
          })}
        </div>
        <p className="rounded-lg border border-graphite-700 bg-graphite-950/70 p-3 text-xs leading-5 text-steel-300">
          {t("privacy.hostedLogs")}
        </p>
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("actions.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
