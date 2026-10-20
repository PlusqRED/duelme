'use client';

import { createContext, useEffect, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_LANGUAGE, parseLanguage, readLanguageCookie } from './language';
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
  /** Read by the root layout from the request's cookie, so the server renders the page in it. */
  language: Language;
  children: ReactNode;
}

export function LanguageProvider({ language, children }: LanguageProviderProps) {
  const router = useRouter();

  // The switch reloads its own tab. Another open tab catches up from the cookie, which holds the
  // reader's choice, when it is shown again or focused (a window that stayed in view beside the
  // other), comes back from the back/forward cache, or finished loading after the switch.
  useEffect(() => {
    const followCookie = () => {
      const chosen = readLanguageCookie(document.cookie);
      if (chosen !== undefined && parseLanguage(chosen) !== language) router.refresh();
    };
    const followWhenSeen = () => {
      if (document.visibilityState === 'visible') followCookie();
    };
    followCookie();
    window.addEventListener('pageshow', followCookie);
    window.addEventListener('focus', followCookie);
    document.addEventListener('visibilitychange', followWhenSeen);
    return () => {
      window.removeEventListener('pageshow', followCookie);
      window.removeEventListener('focus', followCookie);
      document.removeEventListener('visibilitychange', followWhenSeen);
    };
  }, [language, router]);

  const value = useMemo(() => ({ language, ...translator(language) }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
