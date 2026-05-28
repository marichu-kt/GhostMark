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

  return (
    <section className="relative h-full overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_75%_20%,rgba(198,40,40,0.18),transparent_34%),radial-gradient(circle_at_18%_78%,rgba(45,66,98,0.38),transparent_34%),linear-gradient(180deg,#07101e_0%,#0d121a_46%,#070b12_100%)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
      <BrandMark
        variant="watermark"
        className="absolute right-2 top-24 hidden opacity-[0.16] drop-shadow-[0_0_70px_rgba(198,40,40,0.38)] xl:flex xl:scale-[2.35]"
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-72px)] w-full max-w-6xl content-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-3xl gap-7 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-brand-red/45 bg-brand-red/10 text-brand-red shadow-[0_0_44px_rgba(198,40,40,0.28)]">
            <ShieldCheck size={32} aria-hidden="true" />
          </div>

          <div className="grid gap-3">
            <h1 className="text-5xl font-semibold tracking-normal text-white sm:text-6xl">
              <span>{t("app.nameGhost")}</span>
              <span className="text-brand-red">{t("app.nameMark")}</span>
            </h1>
            <p className="text-xl font-medium text-steel-200 sm:text-2xl">{t("app.heroTagline")}</p>
            <div className="mx-auto h-0.5 w-20 rounded-full bg-brand-red" />
          </div>

          <PdfImporter onLoaded={onLoaded} mode="dropzone" />

          <p className="mx-auto max-w-xl text-sm text-steel-300">
            <ShieldCheck size={16} className="mr-2 inline text-steel-400" aria-hidden="true" />
            {t("app.localProcessingLine")}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 text-sm text-steel-400">
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
              {t("actions.securityDetails")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
