import { intlLocales } from './intlLocales';
import {
  translations,
  type Language,
  type PluralKey,
  type TranslationKey,
  type TranslationParams,
} from './translations';

export interface Translator<Key extends string = TranslationKey> {
  t: (key: Key, params?: TranslationParams) => string;
  /**
   * The word that agrees with `count`, alone: the caller places the number, because where it goes
   * differs by language. Intl.PluralRules rather than `count === 1`, since Russian picks among three
   * forms by the last digit, with 11-14 an exception a hand-written rule reliably gets wrong: 21 is
   * "дуэль" but 11 is "дуэлей".
   */
  plural: (key: PluralKey, count: number) => string;
}

/** A translator over a dictionary in every language: a word missing from one is the English one. */
export function createTranslator<Key extends string>(
  dictionaries: Record<Language, Record<Key, string>>,
  language: Language
): Translator<Key> {
  const dictionary: Record<string, string> = dictionaries[language];
  const fallback: Record<string, string> = dictionaries.en;
  const pluralRules = new Intl.PluralRules(intlLocales[language]);

  return {
    t: (key, params) => {
      const template = dictionary[key] ?? fallback[key] ?? key;
      return params
        ? template.replace(/\{(\w+)\}/g, (_, token: string) => String(params[token] ?? `{${token}}`))
        : template;
    },
    plural: (key, count) =>
      dictionary[`${key}.${pluralRules.select(count)}`] ??
      dictionary[`${key}.other`] ??
      fallback[`${key}.other`] ??
      key,
  };
}

const translators: Record<Language, Translator> = {
  en: createTranslator(translations, 'en'),
  ru: createTranslator(translations, 'ru'),
};

/**
 * One language's words, the same object every time, for a server component and for the browser's
 * context alike.
 */
export function translator(language: Language): Translator {
  return translators[language];
}
