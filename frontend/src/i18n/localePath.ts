import { SITE_URL } from '@/lib/constants';
import { DEFAULT_LANGUAGE, LANGUAGES } from './language';
import type { Language } from './translations';

/**
 * Every language has addresses of its own, so a search engine, which sends no cookie and no
 * language, finds each one: English at the root, every other language under its code (`/ru/games`).
 */
function prefixOf(language: Language): string {
  return language === DEFAULT_LANGUAGE ? '' : `/${language}`;
}

/** The language an address is in, by its first segment. */
export function languageOfPath(pathname: string): Language {
  const segment = pathname.split('/')[1];
  return LANGUAGES.find((language) => language !== DEFAULT_LANGUAGE && language === segment) ?? DEFAULT_LANGUAGE;
}

/** The address without its language's prefix: the page as the app's routes name it. */
export function stripLanguage(pathname: string): string {
  const prefix = prefixOf(languageOfPath(pathname));
  if (prefix === '') return pathname;
  return pathname.slice(prefix.length) || '/';
}

/**
 * A page of the site in a language: `/games` in Russian is `/ru/games`, the home page `/ru`. The
 * query and the hash ride along. Anything that is not a path on this site (another site, a bare
 * `#section`) stays as it is, and a path already in a language moves to the one asked for.
 */
export function localePath(href: string, language: Language): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const end = href.search(/[?#]/);
  const pathname = end === -1 ? href : href.slice(0, end);
  const rest = end === -1 ? '' : href.slice(end);
  const page = stripLanguage(pathname);
  const prefix = prefixOf(language);
  return `${prefix && page === '/' ? prefix : `${prefix}${page}`}${rest}`;
}

/** A page's address in every language, and under `x-default` the one for a reader in none of them. */
export function languageAddresses(path: string): Record<Language | 'x-default', string> {
  const addresses = { 'x-default': localePath(path, DEFAULT_LANGUAGE) } as Record<Language | 'x-default', string>;
  for (const language of LANGUAGES) {
    addresses[language] = localePath(path, language);
  }
  return addresses;
}

/** An address on the site in full, as a search engine reads it: the home page with no trailing slash. */
export function absoluteAddress(address: string): string {
  return address === '/' ? SITE_URL : `${SITE_URL}${address}`;
}

/** A page in full on the site this tab has open, in a language: the link a player copies to send. */
export function shareableAddress(path: string, language: Language): string {
  return `${window.location.origin}${localePath(path, language)}`;
}
