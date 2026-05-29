import { useTranslation } from "../../features/i18n/useTranslation";
import { classNames } from "../ui/classNames";

type BrandMarkVariant = "header" | "hero" | "compact" | "empty" | "watermark";

interface BrandMarkProps {
  variant?: BrandMarkVariant;
  showText?: boolean;
  className?: string;
}

const logoSrc = `${import.meta.env.BASE_URL}brand/ghostmark-logo.png`;
const bannerSrc = `${import.meta.env.BASE_URL}brand/banner-RD.png`;

const variantStyles: Record<BrandMarkVariant, string> = {
  header: "items-center",
  hero: "items-center gap-5",
  compact: "items-center gap-0",
  empty: "items-center gap-3",
  watermark: "pointer-events-none select-none items-center opacity-[0.06]",
};

const imageStyles: Record<BrandMarkVariant, string> = {
  header: "h-10 w-auto max-w-[160px] object-contain sm:h-12 sm:max-w-[240px]",
  hero: "h-24 w-24 rounded-md border border-brand-ink/70 bg-brand-paper object-contain p-2 shadow-panel",
  compact: "h-8 w-8 rounded-md border border-brand-ink/70 bg-brand-paper object-contain p-0.5",
  empty: "h-14 w-14 rounded-md border border-graphite-700 bg-brand-paper object-contain p-1",
  watermark: "h-48 w-48 object-contain",
};

export function BrandMark({ variant = "compact", showText = false, className }: BrandMarkProps) {
  const { t } = useTranslation();
  const decorative = variant === "watermark";
  const src = variant === "header" ? bannerSrc : logoSrc;

  return (
    <div className={classNames("flex min-w-0", variantStyles[variant], className)}>
      <img
        src={src}
        alt={decorative ? "" : t("brand.logoAlt")}
        aria-hidden={decorative ? "true" : undefined}
        className={imageStyles[variant]}
      />
      {showText && variant !== "header" ? (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-wide text-white">{t("app.name")}</div>
          {variant === "hero" ? (
            <div className="mt-1 text-sm text-steel-200">{t("app.subtitle")}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
