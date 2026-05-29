import { Github, ShieldCheck } from "lucide-react";
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
  const landingBackground = `${import.meta.env.BASE_URL}brand/landing-background.png`;

  return (
    <section className="relative h-full overflow-hidden bg-[#070c16]">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-55"
        style={{ backgroundImage: `url(${landingBackground})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,45,61,0.18),transparent_32%),linear-gradient(90deg,rgba(7,12,22,0.96)_0%,rgba(7,12,22,0.82)_38%,rgba(7,12,22,0.42)_72%,rgba(7,12,22,0.82)_100%),linear-gradient(180deg,rgba(7,12,22,0.68)_0%,rgba(7,12,22,0.9)_100%)]" />
      <div className="pointer-events-none absolute left-[13%] top-[22%] h-1.5 w-1.5 rounded-full bg-brand-red shadow-[0_0_22px_rgba(255,45,61,0.8)]" />
      <div className="pointer-events-none absolute right-[27%] top-[19%] h-2 w-2 rounded-full bg-brand-red shadow-[0_0_24px_rgba(255,45,61,0.75)]" />
      <div className="pointer-events-none absolute right-[9%] bottom-[25%] h-2 w-2 rounded-full bg-brand-red shadow-[0_0_28px_rgba(255,45,61,0.85)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
      <BrandMark variant="watermark" className="absolute right-0 top-20 hidden opacity-[0.08] xl:flex xl:scale-[2.1]" />

      <div className="relative mx-auto grid h-full w-full max-w-7xl grid-rows-[1fr_auto] px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid min-h-0 place-items-center">
          <div className="mx-auto grid w-full max-w-4xl gap-[clamp(0.75rem,2vh,1.4rem)] text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-brand-red/45 bg-brand-red/10 text-brand-red shadow-[0_0_44px_rgba(255,45,61,0.28)] sm:h-16 sm:w-16">
              <ShieldCheck size={30} aria-hidden="true" />
            </div>

            <div className="grid gap-2">
              <h1 className="text-[clamp(3rem,7vh,4.8rem)] font-semibold leading-none tracking-normal text-white">
                <span>{t("app.nameGhost")}</span>
                <span className="text-brand-red">{t("app.nameMark")}</span>
              </h1>
              <p className="text-[clamp(1.05rem,2.4vh,1.55rem)] font-medium text-steel-200">
                {t("app.heroTagline")}
              </p>
              <div className="mx-auto h-0.5 w-20 rounded-full bg-brand-red" />
            </div>

            <PdfImporter onLoaded={onLoaded} mode="dropzone" />

            <p className="mx-auto max-w-xl text-sm text-steel-300">
              <ShieldCheck size={16} className="mr-2 inline text-steel-400" aria-hidden="true" />
              {t("app.localProcessingLead")}{" "}
              <span className="font-semibold text-brand-red">{t("app.localProcessingHighlight")}</span>
            </p>
          </div>
        </div>

        <div className="flex min-h-11 items-end justify-between gap-3 text-sm text-steel-400">
          <span className="rounded-full border border-graphite-700 bg-graphite-950/70 px-4 py-2">
            {t("app.version")}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://github.com/marichu-kt/GhostMark"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-graphite-700 bg-graphite-950/70 px-4 py-2 font-medium text-steel-200 transition-colors hover:border-steel-500 hover:text-white"
            >
              <Github size={16} aria-hidden="true" />
              {t("actions.openSource")}
            </a>
            <Button variant="ghost" size="sm" onClick={onOpenSecurity}>
              <ShieldCheck size={15} aria-hidden="true" />
              {t("actions.privacy")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
