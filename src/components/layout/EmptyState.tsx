import { ShieldCheck } from "lucide-react";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";
import { PdfImporter } from "../pdf/PdfImporter";
import type { LoadedPdf } from "../../types/pdf";
import { BrandMark } from "../brand/BrandMark";

interface EmptyStateProps {
  onLoaded: (document: LoadedPdf) => void;
  onOpenSecurity: () => void;
}

export function EmptyState({ onLoaded, onOpenSecurity }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <section className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-5xl items-center px-4 py-8 sm:px-6">
      <div className="relative w-full overflow-hidden rounded-md border border-graphite-700 bg-graphite-900 shadow-panel">
        <div className="absolute right-8 top-8 hidden opacity-25 lg:block" aria-hidden="true">
          <BrandMark variant="watermark" />
        </div>
        <div className="grid gap-5 p-6 sm:p-8 lg:p-10">
          <BrandMark variant="hero" />
          <div className="grid gap-2">
            <h1 className="text-4xl font-semibold tracking-normal text-white">{t("app.name")}</h1>
            <p className="text-lg text-steel-100">{t("app.subtitle")}</p>
            <p className="max-w-xl text-sm leading-6 text-steel-300">{t("app.description")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PdfImporter onLoaded={onLoaded} mode="button" />
            <Button variant="ghost" size="sm" onClick={onOpenSecurity}>
              <ShieldCheck size={15} aria-hidden="true" />
              {t("actions.securityDetails")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
