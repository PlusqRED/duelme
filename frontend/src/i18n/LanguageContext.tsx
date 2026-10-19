'use client';

import { createContext, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { languageCookie } from './language';
import { translator, type Translator } from './translate';
import type { Language } from './translations';

interface LanguageContextValue extends Translator {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  ...translator('en'),
});

interface LanguageProviderProps {
  /** Read by the root layout from the request's cookie, so the server renders the page in it. */
  language: Language;
  children: ReactNode;
}

export function LanguageProvider({ language, children }: LanguageProviderProps) {
  const router = useRouter();

  // The new language comes back from the server with the refreshed page, so the server's parts and
  // the browser's switch together and the cookie stays the only place the language is kept.
  const setLanguage = useCallback(
    (next: Language) => {
      document.cookie = languageCookie(next);
      router.refresh();
    },
    [router]
  );

  const value = useMemo(
    () => ({ language, setLanguage, ...translator(language) }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
