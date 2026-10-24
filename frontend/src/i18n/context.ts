import { createContext } from "react";

import type { TranslationKey } from "./en";

export type Language = "en" | "ur";
export type Direction = "ltr" | "rtl";

export interface TranslateParams {
  [key: string]: string | number;
}

export interface I18nContextValue {
  language: Language;
  direction: Direction;
  /** BCP-47 locale for Intl. Urdu pins `nu-latn` so digits stay Latin. */
  locale: string;
  setLanguage: (language: Language) => void;
  /** Translate a key, filling `{placeholders}` from `params`. */
  t: (key: TranslationKey, params?: TranslateParams) => string;
  /** e.g. "14 Mar 2026" / "۱۴ مارچ ۲۰۲۶" with Latin digits. */
  formatDate: (value: Date | string) => string;
  /** Short relative time: "Just now", "3 h ago". */
  formatRelativeTime: (value: Date | string) => string;
  formatNumber: (value: number) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export const LANGUAGE_STORAGE_KEY = "ldr.language";

export const LOCALES: Record<Language, string> = {
  en: "en-GB",
  // `-u-nu-latn` keeps Latin digits in Urdu, which the project standardises on
  // so numbers read the same in both languages.
  ur: "ur-PK-u-nu-latn",
};

export const DIRECTIONS: Record<Language, Direction> = {
  en: "ltr",
  ur: "rtl",
};
