import { translations, type Language } from './translations';

/** The language of an address without a prefix, and of anything the site cannot read. */
export const DEFAULT_LANGUAGE: Language = 'en';

/**
 * The request header `proxy.ts` sets from the address, for the server parts to read. The proxy
 * always writes it, so whatever a browser sent under that name never reaches the page.
 */
export const LANGUAGE_HEADER = 'x-duelme-language';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && Object.hasOwn(translations, value);
}

/** The site's languages, in the order the switch offers them. */
export const LANGUAGES: readonly Language[] = Object.keys(translations).filter(isLanguage);

/** The language a value names, or English for anything else. */
export function parseLanguage(value: unknown): Language {
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}
