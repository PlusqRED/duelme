import { pluralize } from './pluralize';
import {
  translations,
  type Language,
  type PluralKey,
  type TranslationKey,
  type TranslationParams,
} from './translations';

export interface Translator {
  t: (key: TranslationKey, params?: TranslationParams) => string;
  plural: (key: PluralKey, count: number) => string;
}

/** One language's words, the same for a server component and for the browser's context. */
export function translator(language: Language): Translator {
  return {
    t: (key, params) => {
      const template = translations[language][key] ?? translations.en[key] ?? key;
      return params
        ? template.replace(/\{(\w+)\}/g, (_, token: string) => String(params[token] ?? `{${token}}`))
        : template;
    },
    plural: (key, count) => pluralize(language, key, count),
  };
}
