import { Globe2 } from "lucide-react";
import { useAppSettings } from "../../app/AppProviders";
import { languages } from "../../features/i18n/languages";
import { useTranslation } from "../../features/i18n/useTranslation";

export function LanguageSelector() {
  const { language, setLanguage } = useAppSettings();
  const { t } = useTranslation();
  const currentLanguage = languages.find((item) => item.code === language) ?? languages[0];

  return (
    <label className="flex items-center gap-2 text-xs text-steel-200" title={t("language.note")}>
      <Globe2 size={16} aria-hidden="true" />
      <span className="sr-only">{t("language.label")}</span>
      <span className="text-base" aria-hidden="true">
        {currentLanguage.flag}
      </span>
      <select
        aria-label={t("language.label")}
        value={language}
        onChange={(event) => setLanguage(event.target.value as typeof language)}
        className="max-w-36 rounded-md border border-graphite-700 bg-graphite-950 px-2 py-1 text-xs text-white"
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.flag} {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}
