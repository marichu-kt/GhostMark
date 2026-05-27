import { useCallback } from "react";
import { useAppSettings } from "../../app/AppProviders";
import { translate, type TranslationKey } from "./i18n";

export function useTranslation() {
  const { language } = useAppSettings();

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) =>
      translate(language, key, values),
    [language],
  );

  return { t, language };
}
