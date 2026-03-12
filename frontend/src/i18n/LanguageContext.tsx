'use client';

import {
  createContext,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import {
  translations,
  type Language,
  type TranslationKey,
  type TranslationParams,
} from './translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key: TranslationKey, params?: TranslationParams) => {
    const template = translations.en[key] ?? key;
    return params
      ? template.replace(/\{(\w+)\}/g, (_, token: string) => String(params[token] ?? `{${token}}`))
      : template;
  },
});

const STORAGE_KEY = 'duelme-lang';

function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'en' || stored === 'ru' ? stored : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams): string => {
      const template = translations[language][key] ?? translations.en[key] ?? key;
      return params
        ? template.replace(/\{(\w+)\}/g, (_, token: string) => String(params[token] ?? `{${token}}`))
        : template;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
