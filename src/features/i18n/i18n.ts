import type { LanguageCode } from "../../types/i18n";
import { ar } from "./translations/ar";
import { bn } from "./translations/bn";
import { en, type TranslationDictionary, type TranslationKey } from "./translations/en";
import { es } from "./translations/es";
import { fr } from "./translations/fr";
import { hi } from "./translations/hi";
import { pt } from "./translations/pt";
import { ru } from "./translations/ru";
import { ur } from "./translations/ur";
import { zh } from "./translations/zh";

export type { TranslationDictionary, TranslationKey };

export const dictionaries: Record<LanguageCode, TranslationDictionary> = {
  en,
  zh,
  hi,
  es,
  ar,
  fr,
  bn,
  pt,
  ru,
  ur,
};

export function translate(
  language: LanguageCode,
  key: TranslationKey,
  values?: Record<string, string | number>,
): string {
  const template = dictionaries[language][key] ?? dictionaries.en[key] ?? key;

  if (!values) {
    return template;
  }

  return Object.entries(values).reduce(
    (message, [name, value]) => message.split(`{${name}}`).join(String(value)),
    template,
  );
}
