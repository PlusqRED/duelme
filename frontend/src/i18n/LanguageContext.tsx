'use client';

import { createContext, startTransition, useCallback, useEffect, useMemo, useOptimistic, useRef, type ReactNode } from 'react';
import { unstable_isUnrecognizedActionError, usePathname, useRouter } from 'next/navigation';
import { DEFAULT_LANGUAGE, languageCookie, parseLanguage, readLanguageCookie } from './language';
import { saveLanguage } from './saveLanguage';
import { translator, type Translator } from './translate';
import type { Language } from './translations';

/** Tells the site's other open tabs that a language was chosen, so they fetch their page in it too. */
const LANGUAGE_CHANNEL = 'duelme-language';

/**
 * How a switch ended: saved; blocked, because the browser keeps no cookies for the site, so the
 * server would render the old language again; or failed, because the server could not be reached.
 * Nothing changes unless it was saved, and the caller says why.
 */
export type LanguageSwitch = 'saved' | 'blocked' | 'failed';

interface LanguageContextValue extends Translator {
  language: Language;
  setLanguage: (language: Language) => Promise<LanguageSwitch>;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: async () => 'saved',
  ...translator(DEFAULT_LANGUAGE),
});

interface LanguageProviderProps {
  /** Read by the root layout from the request's cookie, so the server renders the page in it. */
  language: Language;
  children: ReactNode;
}

export function LanguageProvider({ language, children }: LanguageProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  // A language just chosen shows at once in the parts the browser draws; the server's parts and
  // `<html lang>` follow with the re-rendered page, which ends the transition.
  const [shown, showLanguage] = useOptimistic(language);
  // For the handlers below, which run on events: the language on screen now, and the last one chosen.
  const shownNow = useRef(shown);
  const chosenLast = useRef<Language | null>(null);
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
  // its page again in that language when it loads, comes back into view or moves to another page.
  const followCookie = useCallback(() => {
    const chosen = readLanguageCookie(document.cookie);
    if (chosen !== undefined) follow(parseLanguage(chosen));
  }, [follow]);

  useEffect(() => {
    followCookie();
  }, [pathname, followCookie]);

  useEffect(() => {
    const followWhenSeen = () => {
      if (document.visibilityState === 'visible') followCookie();
    };
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
    async (next: Language): Promise<LanguageSwitch> => {
      // The cookie as well as the screen: a tab can show one language while the cookie holds another.
      if (next === shownNow.current && readLanguageCookie(document.cookie) === next) return 'saved';
      // Written here as well as by the server: it shows whether the browser keeps the site's cookies
      // at all, and a reload after a deploy finds it.
      document.cookie = languageCookie(next);
      if (readLanguageCookie(document.cookie) !== next) return 'blocked';
      chosenLast.current = next;
      const saving = new Promise<void>((resolve, reject) => {
        startTransition(() => {
          showLanguage(next);
          // Called inside the transition, so the page it returns ends it, but not awaited there:
          // React would hold every navigation started meanwhile until the action came back.
          saveLanguage(next).then(resolve, reject);
        });
      });
      try {
        await saving;
      } catch (error) {
        if (unstable_isUnrecognizedActionError(error)) {
          // A page open across a deploy calls an action the new server no longer has; the cookie is
          // written, and the new build needs a new page anyway.
          window.location.reload();
          return 'saved';
        }
        // The screen goes back by itself; the cookie goes back unless a newer choice holds it.
        if (chosenLast.current === next) document.cookie = languageCookie(language);
        return 'failed';
      }
      // Only now, and only for the latest choice: the server has set the cookie, so the other tabs'
      // requests carry it, and they do not pass through a language the reader has already left.
      if (chosenLast.current === next) channel.current?.postMessage(next);
      return 'saved';
    },
    [language, showLanguage]
  );

  const value = useMemo(() => ({ language: shown, setLanguage, ...translator(shown) }), [shown, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
