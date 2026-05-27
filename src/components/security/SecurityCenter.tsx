import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { LoadedPdf } from "../../types/pdf";
import type { PrivacyCheckResult } from "../../types/security";
import { useAppSettings } from "../../app/AppProviders";
import { runPrivacyChecks } from "../../features/security/privacyChecks";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";
import { FieldGroup } from "../ui/FieldGroup";
import { Notice } from "../ui/Notice";
import { BrandMark } from "../brand/BrandMark";
import { PrivacyChecklist } from "./PrivacyChecklist";
import { ClassifiedModePanel } from "./ClassifiedModePanel";
import { PrivacyNotice } from "./PrivacyNotice";

interface SecurityCenterProps {
  loadedPdf: LoadedPdf | null;
}

export function SecurityCenter({ loadedPdf }: SecurityCenterProps) {
  const { classifiedMode } = useAppSettings();
  const { t } = useTranslation();
  const [result, setResult] = useState<PrivacyCheckResult | null>(null);

  return (
    <>
      <section className="grid gap-3 rounded-md border border-graphite-700 bg-graphite-950 p-4">
        <div className="flex items-center gap-3">
          <BrandMark variant="compact" />
          <h3 className="text-sm font-semibold text-white">{t("brand.aboutTitle")}</h3>
        </div>
        <p className="text-sm leading-6 text-steel-300">{t("brand.aboutBody")}</p>
        <Notice tone="warning">{t("brand.aboutLimit")}</Notice>
      </section>

      <FieldGroup title={t("security.title")}>
        <PrivacyChecklist />
        <Button
          variant="primary"
          onClick={() => setResult(runPrivacyChecks({ loadedPdf, classifiedMode }))}
        >
          <ShieldCheck size={16} aria-hidden="true" />
          {t("actions.runPrivacyCheck")}
        </Button>
      </FieldGroup>

      {result ? (
        <FieldGroup title={t("security.privacyCheckResult")}>
          <Notice tone="success">{result.summary}</Notice>
          <div className="grid gap-2">
            {result.items.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-graphite-700 bg-graphite-950 p-3 text-sm"
              >
                <div className="font-medium text-white">{item.label}</div>
                <div className="mt-1 text-xs leading-5 text-steel-300">{item.detail}</div>
              </div>
            ))}
          </div>
        </FieldGroup>
      ) : null}

      <ClassifiedModePanel />
      <PrivacyNotice />
    </>
  );
}
