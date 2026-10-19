'use client';

import { createContext, startTransition, useCallback, useEffect, useMemo, useOptimistic, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_LANGUAGE, languageCookie, parseLanguage, readLanguageCookie } from './language';
import { saveLanguage } from './saveLanguage';
import { translator, type Translator } from './translate';
import type { Language } from './translations';

/** Tells the site's other open tabs that a language was chosen, so they fetch their page in it too. */
const LANGUAGE_CHANNEL = 'duelme-language';

interface LanguageContextValue extends Translator {
  language: Language;
  /**
   * Switches the site to `language`. False when the browser keeps no cookies for the site: the
   * server would render the old language again, so nothing changes and the caller says why.
   */
  setLanguage: (language: Language) => boolean;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => true,
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
  // `<html lang>` follow with the re-rendered page, which ends the transition.
  const [shown, showLanguage] = useOptimistic(language);
  // For the handlers below, which are made once and run on events: the language on screen now.
  const shownNow = useRef(shown);
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    shownNow.current = shown;
  }, [shown]);

  const follow = useCallback(
    (next: Language) => {
      if (next === shownNow.current) return;
      startTransition(() => {
        showLanguage(next);
        router.refresh();
      });
    },
    [router, showLanguage]
  );

  // The cookie holds the reader's choice. A tab that missed a switch made in another one, because it
  // was still loading, sat in the back/forward cache, or lost its refresh to a navigation, fetches
  // its page again in that language.
  const followCookie = useCallback(() => {
    const chosen = readLanguageCookie(document.cookie);
    if (chosen !== undefined) follow(parseLanguage(chosen));
  }, [follow]);

  useEffect(() => {
    const followWhenSeen = () => {
      if (document.visibilityState === 'visible') followCookie();
    };
    followCookie();
    window.addEventListener('pageshow', followCookie);
    document.addEventListener('visibilitychange', followWhenSeen);
    const tabs = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(LANGUAGE_CHANNEL);
    if (tabs) {
      // The language comes with the message: a cookie another tab just set can take a moment to
      // reach this one's `document.cookie`.
      tabs.onmessage = (event: MessageEvent<unknown>) => {
        if (typeof event.data === 'string') follow(parseLanguage(event.data));
      };
    }
    channel.current = tabs;
    return () => {
      window.removeEventListener('pageshow', followCookie);
      document.removeEventListener('visibilitychange', followWhenSeen);
      tabs?.close();
      channel.current = null;
    };
  }, [follow, followCookie]);

  const setLanguage = useCallback(
    (next: Language) => {
      if (next === shownNow.current) return true;
      // Written here as well as by the server: it shows whether the browser keeps the site's cookies
      // at all, and a reload after a failed action finds it.
      document.cookie = languageCookie(next);
      if (readLanguageCookie(document.cookie) !== next) return false;
      startTransition(async () => {
        showLanguage(next);
        try {
          await saveLanguage(next);
        } catch {
          // A page open across a deploy calls an action the new server no longer has; the cookie
          // is already written, and the new build needs a new page anyway.
          window.location.reload();
          return;
        }
        // Only now: the server has set the cookie, so the other tabs' requests carry it.
        channel.current?.postMessage(next);
      });
      return true;
    },
    [showLanguage]
  );

  const value = useMemo(() => ({ language: shown, setLanguage, ...translator(shown) }), [shown, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
