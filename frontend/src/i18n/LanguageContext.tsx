'use client';

import { createContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_LANGUAGE } from './language';
import { translator, type Translator } from './translate';
import type { Language } from './translations';

interface LanguageContextValue extends Translator {
  language: Language;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  ...translator(DEFAULT_LANGUAGE),
});

interface LanguageProviderProps {
  /** The page's language, read by the root layout from its address. */
  language: Language;
  children: ReactNode;
}

export function LanguageProvider({ language, children }: LanguageProviderProps) {
  const value = useMemo(() => ({ language, ...translator(language) }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
