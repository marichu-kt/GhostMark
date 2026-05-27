import type { LanguageCode, LanguageDefinition } from "../../types/i18n";

export const languages: LanguageDefinition[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", direction: "ltr" },
  { code: "zh", name: "Mandarin Chinese", nativeName: "中文", flag: "🇨🇳", direction: "ltr" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", direction: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Spanish", flag: "🇪🇸", direction: "ltr" },
  { code: "ar", name: "Standard Arabic", nativeName: "العربية", flag: "🇸🇦", direction: "rtl" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", direction: "ltr" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇧🇩", direction: "ltr" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹", direction: "ltr" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", direction: "ltr" },
  { code: "ur", name: "Urdu", nativeName: "اردو", flag: "🇵🇰", direction: "rtl" },
  { code: "he", name: "Hebrew", nativeName: "עברית", flag: "🇮🇱", direction: "rtl" },
];

export function getLanguageDefinition(code: LanguageCode): LanguageDefinition {
  return languages.find((language) => language.code === code) ?? languages[0];
}

export function isLanguageCode(value: string): value is LanguageCode {
  return languages.some((language) => language.code === value);
}
