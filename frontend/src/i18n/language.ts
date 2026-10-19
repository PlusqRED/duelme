import { translations, type Language } from './translations';

/** Keeps the reader's language. The server reads it, so a page arrives already in that language. */
export const LANGUAGE_COOKIE = 'duelme-lang';

export const DEFAULT_LANGUAGE: Language = 'en';

const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function isLanguage(value: string | undefined): value is Language {
  return value !== undefined && Object.hasOwn(translations, value);
}

/** The language a cookie names, or English for anything else, since the browser may send any value. */
export function parseLanguage(value: string | undefined): Language {
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

/**
 * Where and how long the cookie lives, for the server's write and the browser's alike: two writes
 * that differ would be two cookies, or one the browser refuses to replace.
 */
export const LANGUAGE_COOKIE_OPTIONS = { path: '/', maxAge: LANGUAGE_COOKIE_MAX_AGE_SECONDS, sameSite: 'lax' } as const;

/** The `document.cookie` assignment that keeps `language` for a year. */
export function languageCookie(language: Language): string {
  const { path, maxAge, sameSite } = LANGUAGE_COOKIE_OPTIONS;
  return `${LANGUAGE_COOKIE}=${language}; path=${path}; max-age=${maxAge}; samesite=${sameSite}`;
}
