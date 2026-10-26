import { isLanguage } from '@/i18n/language';
import type { Language } from '@/i18n/translations';
import { browserStorage } from '@/lib/browserStorage';

/**
 * Linking Steam or Telegram leaves the site, and the backend sends the player back to `/profile`,
 * which is the English address. The language they left in is kept for that one return.
 */
export const OAUTH_RETURN_KEY = 'duelme:oauth-return-language';

type ReturnStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Keeps the language for the return; a browser that keeps nothing brings the player back in English. */
export function rememberOAuthReturn(language: Language, storage: ReturnStorage | null = browserStorage('session')): void {
  try {
    storage?.setItem(OAUTH_RETURN_KEY, language);
  } catch {
    // A full or blocked storage only costs the return its language.
  }
}

/** The language kept for this return, once: reading it forgets it. */
export function takeOAuthReturn(storage: ReturnStorage | null = browserStorage('session')): Language | null {
  try {
    const kept = storage?.getItem(OAUTH_RETURN_KEY) ?? null;
    storage?.removeItem(OAUTH_RETURN_KEY);
    return isLanguage(kept) ? kept : null;
  } catch {
    return null;
  }
}
