import { translations, type Language } from './translations';

/** Keeps the reader's language. The server reads it, so a page arrives already in that language. */
export const LANGUAGE_COOKIE = 'duelme-lang';

export const DEFAULT_LANGUAGE: Language = 'en';

/** Set by the server alone, in a response, which Safari keeps for the full year rather than a week. */
export const LANGUAGE_COOKIE_OPTIONS = { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' } as const;

/** Where the language switch posts the reader's choice. */
export const LANGUAGE_ROUTE = '/api/language';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && Object.hasOwn(translations, value);
}

/** The site's languages, in the order the switch offers them. */
export const LANGUAGES: readonly Language[] = Object.keys(translations).filter(isLanguage);

/** The language a cookie names, or English for anything else, since a browser may send any value. */
export function parseLanguage(value: unknown): Language {
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}

/** The language cookie's value in a `document.cookie` string, or undefined without one. */
export function readLanguageCookie(cookies: string): string | undefined {
  const prefix = `${LANGUAGE_COOKIE}=`;
  return cookies
    .split('; ')
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}
