"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { getTranslation, type Locale, pickLocale } from "@/i18n/translations";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale ?? "en");

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => getTranslation(locale, key, vars),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used inside <I18nProvider>");
  }
  return ctx;
}

export { pickLocale };
