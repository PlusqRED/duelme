import {
  translations,
  type Language,
  type PluralKey,
  type TranslationKey,
  type TranslationParams,
} from './translations';

export interface Translator {
  t: (key: TranslationKey, params?: TranslationParams) => string;
  /**
   * The word that agrees with `count`, alone: the caller places the number, because where it goes
   * differs by language. Intl.PluralRules rather than `count === 1`, since Russian picks among three
   * forms by the last digit, with 11-14 an exception a hand-written rule reliably gets wrong: 21 is
   * "дуэль" but 11 is "дуэлей".
   */
  plural: (key: PluralKey, count: number) => string;
}

function createTranslator(language: Language): Translator {
  const dictionary: Record<string, string> = translations[language];
  const fallback: Record<string, string> = translations.en;
  const pluralRules = new Intl.PluralRules(language);

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
  en: createTranslator('en'),
  ru: createTranslator('ru'),
};

/**
 * One language's words, the same object every time, for a server component and for the browser's
 * context alike.
 */
export function translator(language: Language): Translator {
  return translators[language];
}
