export type LanguageCode =
  | "en"
  | "zh"
  | "hi"
  | "es"
  | "ar"
  | "fr"
  | "bn"
  | "pt"
  | "ru"
  | "ur";

export interface LanguageDefinition {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  direction: "ltr" | "rtl";
}
