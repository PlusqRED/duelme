import { translations, type Language, type PluralKey } from './translations';

/**
 * Picks the plural form for `count` in `language` and returns that word alone — the caller
 * places the number, because where it goes differs by language.
 *
 * Intl.PluralRules rather than `count === 1`: Russian selects between three forms on the
 * last digit, with 11-14 an exception that a hand-written rule reliably gets wrong — 21 is
 * "дуэль" but 11 is "дуэлей".
 *
 * Its own module so it can be tested without rendering a provider, and so the context stays
 * a context.
 */
export function pluralize(language: Language, key: PluralKey, count: number): string {
  const category = new Intl.PluralRules(language).select(count);
  const dictionary: Record<string, string> = translations[language];
  const fallback: Record<string, string> = translations.en;
  return (
    dictionary[`${key}.${category}`] ??
    dictionary[`${key}.other`] ??
    fallback[`${key}.other`] ??
    key
  );
}
