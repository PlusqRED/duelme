'use client';

import { createContext, startTransition, useCallback, useEffect, useMemo, useOptimistic, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DEFAULT_LANGUAGE, languageCookie, parseLanguage, readLanguageCookie } from './language';
import { translator, type Translator } from './translate';
import type { Language } from './translations';

/** Tells the site's other open tabs that a language was chosen, so they fetch their page in it too. */
const LANGUAGE_CHANNEL = 'duelme-language';

interface LanguageContextValue extends Translator {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  ...translator(DEFAULT_LANGUAGE),
});

interface LanguageProviderProps {
  /** Read by the root layout from the request's cookie, so the server renders the page in it. */
  language: Language;
  children: ReactNode;
}

export function LanguageProvider({ language, children }: LanguageProviderProps) {
  const router = useRouter();
  // A language just chosen shows at once in the parts the browser draws; the server's parts and
  // `<html lang>` follow when the refreshed page arrives, which ends the transition.
  const [shown, showLanguage] = useOptimistic(language);
  // The last language asked for. The one shown stays the old one until the refresh lands, so a quick
  // switch back has to be told apart from a click on the language already there by this instead.
  const requested = useRef(language);
  const channel = useRef<BroadcastChannel | null>(null);

  const follow = useCallback(
    (next: Language) => {
      requested.current = next;
      startTransition(() => {
        showLanguage(next);
        router.refresh();
      });
    },
    [router, showLanguage]
  );

  useEffect(() => {
    // Safari keeps a cookie a page wrote for seven days at most, so each visit writes it again.
    document.cookie = languageCookie(requested.current);
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const tabs = new BroadcastChannel(LANGUAGE_CHANNEL);
    tabs.onmessage = (event: MessageEvent<unknown>) => {
      if (typeof event.data === 'string') follow(parseLanguage(event.data));
    };
    channel.current = tabs;
    return () => tabs.close();
  }, [follow]);

  const setLanguage = useCallback(
    (next: Language) => {
      if (next === requested.current) return;
      document.cookie = languageCookie(next);
      // With the site's cookies blocked the server would render the old language again, so the
      // switch says why it cannot happen instead of snapping back unexplained.
      if (readLanguageCookie(document.cookie) !== next) {
        toast.error(translator(requested.current).t('toast.languageNotKept'));
        return;
      }
      channel.current?.postMessage(next);
      follow(next);
    },
    [follow]
  );

  const value = useMemo(() => ({ language: shown, setLanguage, ...translator(shown) }), [shown, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
