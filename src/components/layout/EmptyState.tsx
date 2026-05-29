import { FileText, Github, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";
import { PdfImporter } from "../pdf/PdfImporter";
import type { LoadedPdf } from "../../types/pdf";
import { PrivacyModal } from "../security/PrivacyModal";

interface EmptyStateProps {
  onLoaded: (document: LoadedPdf) => void;
}

export function EmptyState({ onLoaded }: EmptyStateProps) {
  const { t } = useTranslation();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const landingBackground = `${import.meta.env.BASE_URL}brand/background.png`;

  return (
    <section className="relative h-full overflow-hidden bg-[#070c16]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${landingBackground})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      <div className="relative mx-auto grid h-full w-full max-w-7xl grid-rows-[1fr_auto] px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid min-h-0 place-items-center">
          <div className="mx-auto grid w-full max-w-5xl gap-[clamp(0.85rem,2.2vh,1.55rem)] text-center">
            <div className="grid gap-2.5">
              <h1 className="text-[clamp(3.45rem,8.1vh,5.55rem)] font-semibold leading-none tracking-normal text-white">
                <span>{t("app.nameGhost")}</span>
                <span className="text-brand-red">{t("app.nameMark")}</span>
              </h1>
              <p className="text-[clamp(1.18rem,2.65vh,1.72rem)] font-medium text-steel-100">
                {t("app.heroTagline")}
              </p>
              <div className="mx-auto h-0.5 w-20 rounded-full bg-brand-red" />
            </div>

            <PdfImporter onLoaded={onLoaded} mode="dropzone" />
          </div>
        </div>

        <div className="flex min-h-11 flex-wrap items-end justify-center gap-3 text-sm text-steel-400 md:justify-between">
          <p className="mx-auto max-w-xl text-center text-sm text-steel-300 md:mx-0">
            <ShieldCheck size={16} className="mr-2 inline text-steel-400" aria-hidden="true" />
            {t("app.localProcessingLead")}{" "}
            <span className="font-semibold text-brand-red">{t("app.localProcessingHighlight")}</span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`${import.meta.env.BASE_URL}editor-pdf-marca-agua/`}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-graphite-700 bg-graphite-950/70 px-4 py-2 font-medium text-steel-200 transition-colors hover:border-steel-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-red/60 focus:ring-offset-2 focus:ring-offset-graphite-950"
            >
              <FileText size={16} aria-hidden="true" />
              {t("seo.spanishPageLink")}
            </a>
            <a
              href="https://github.com/marichu-kt/GhostMark"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-graphite-700 bg-graphite-950/70 px-4 py-2 font-medium text-steel-200 transition-colors hover:border-steel-500 hover:text-white"
            >
              <Github size={16} aria-hidden="true" />
              {t("actions.openSource")}
            </a>
            <Button variant="ghost" size="sm" onClick={() => setPrivacyOpen(true)}>
              <ShieldCheck size={15} aria-hidden="true" />
              {t("actions.privacy")}
            </Button>
          </div>
        </div>
      </div>
      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </section>
  );
}
