import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { LanguageCode } from "../types/i18n";
import { getLanguageDefinition, isLanguageCode } from "../features/i18n/languages";

const LANGUAGE_STORAGE_KEY = "ghostmark.language";

interface AppSettingsContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  classifiedMode: boolean;
  setClassifiedMode: (enabled: boolean) => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

function readStoredLanguage(): LanguageCode {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored && isLanguageCode(stored) ? stored : "en";
  } catch {
    return "en";
  }
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => readStoredLanguage());
  const [classifiedMode, setClassifiedModeState] = useState(false);

  const setLanguage = useCallback(
    (nextLanguage: LanguageCode) => {
      setLanguageState(nextLanguage);

      if (!classifiedMode) {
        try {
          window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
        } catch {
          // Storage is optional. GhostMark remains usable without persistence.
        }
      }
    },
    [classifiedMode],
  );

  const setClassifiedMode = useCallback(
    (enabled: boolean) => {
      setClassifiedModeState(enabled);

      try {
        if (enabled) {
          window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
        } else {
          window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        }
      } catch {
        // Storage access can be disabled by the browser or deployment context.
      }
    },
    [language],
  );

  useEffect(() => {
    const definition = getLanguageDefinition(language);
    document.documentElement.lang = language;
    document.documentElement.dir = definition.direction;
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, classifiedMode, setClassifiedMode }),
    [classifiedMode, language, setClassifiedMode, setLanguage],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);

  if (!context) {
    throw new Error("useAppSettings must be used inside AppProviders.");
  }

  return context;
}
