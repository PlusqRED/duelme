import { translations, type Language } from './translations';

/** Keeps the reader's language. The server reads it, so a page arrives already in that language. */
export const LANGUAGE_COOKIE = 'duelme-lang';

const DEFAULT_LANGUAGE: Language = 'en';

const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function isLanguage(value: string | undefined): value is Language {
  return value !== undefined && Object.hasOwn(translations, value);
}

/** The language a cookie names, or English for anything else, since the browser may send any value. */
export function parseLanguage(value: string | undefined): Language {
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}

/** The `document.cookie` assignment that keeps `language` for a year. */
export function languageCookie(language: Language): string {
  return `${LANGUAGE_COOKIE}=${language}; path=/; max-age=${LANGUAGE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}
