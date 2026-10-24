import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import en, { type TranslationKey } from "./en";
import ur from "./ur";
import {
  DIRECTIONS,
  I18nContext,
  LANGUAGE_STORAGE_KEY,
  LOCALES,
  type I18nContextValue,
  type Language,
  type TranslateParams,
} from "./context";

const DICTIONARIES = { en, ur } as const;

function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "ur";
}

/** localStorage throws in some privacy modes; a failed read just means "default". */
function readStoredLanguage(): Language | null {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredLanguage(language: Language): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Preference simply will not persist; the app still works.
  }
}

function detectLanguage(): Language {
  const stored = readStoredLanguage();
  if (stored) return stored;
  try {
    if (window.navigator.language.toLowerCase().startsWith("ur")) return "ur";
  } catch {
    // Non-browser environment.
  }
  return "en";
}

/** Replace `{name}` placeholders. Unknown placeholders are left as-is. */
function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectLanguage);

  const direction = DIRECTIONS[language];
  const locale = LOCALES[language];

  // The document element owns `lang`/`dir`: CSS logical properties, font
  // selection (`:lang(ur)`) and the browser's own text shaping all key off it.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("lang", language);
    root.setAttribute("dir", direction);
  }, [language, direction]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    writeStoredLanguage(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslateParams): string => {
      const dictionary = DICTIONARIES[language];
      // `ur` is typed against `en`, so a missing key is a build error, not a
      // runtime one. The fallback only covers a hand-edited bundle.
      const template = dictionary[key] ?? en[key] ?? key;
      return interpolate(template, params);
    },
    [language],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [locale],
  );

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const formatDate = useCallback(
    (value: Date | string) => {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return dateFormatter.format(date);
    },
    [dateFormatter],
  );

  const formatNumber = useCallback(
    (value: number) => numberFormatter.format(value),
    [numberFormatter],
  );

  const formatRelativeTime = useCallback(
    (value: Date | string) => {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return "";

      const diffMs = Date.now() - date.getTime();
      const minutes = Math.floor(diffMs / 60_000);
      if (minutes < 1) return t("time.justNow");
      if (minutes < 60) return t("time.minutes", { count: formatNumber(minutes) });

      const hours = Math.floor(minutes / 60);
      if (hours < 24) return t("time.hours", { count: formatNumber(hours) });

      const days = Math.floor(hours / 24);
      if (days < 7) return t("time.days", { count: formatNumber(days) });

      const weeks = Math.floor(days / 7);
      return t("time.weeks", { count: formatNumber(weeks) });
    },
    [t, formatNumber],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      direction,
      locale,
      setLanguage,
      t,
      formatDate,
      formatRelativeTime,
      formatNumber,
    }),
    [language, direction, locale, setLanguage, t, formatDate, formatRelativeTime, formatNumber],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export default I18nProvider;
