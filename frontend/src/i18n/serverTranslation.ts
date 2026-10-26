import { headers } from 'next/headers';
import { cache } from 'react';
import { LANGUAGE_HEADER, parseLanguage } from './language';
import { pageTranslations, type PageTranslationKey } from './pageTranslations';
import { createTranslator, type Translator } from './translate';
import { translations, type Language, type TranslationKey } from './translations';

/** The words a server component can say: the browser's, and the ones only pages say. */
export type ServerTranslator = Translator<TranslationKey | PageTranslationKey>;

/** Every word a server component can say, by language: the browser's, and the pages' own over them. */
export const serverDictionaries = {
  en: { ...translations.en, ...pageTranslations.en },
  ru: { ...translations.ru, ...pageTranslations.ru },
};

const serverTranslators: Record<Language, ServerTranslator> = {
  en: createTranslator(serverDictionaries, 'en'),
  ru: createTranslator(serverDictionaries, 'ru'),
};

/** One language's words on the server, for a part with no request to read the language from: a share image. */
export function serverTranslator(language: Language): ServerTranslator {
  return serverTranslators[language];
}

/**
 * The page's language, from its address: `proxy.ts` reads it there and hands it on in a request
 * header. Read once per request, however many server parts ask.
 */
export const getLanguage = cache(async (): Promise<Language> => {
  const requestHeaders = await headers();
  return parseLanguage(requestHeaders.get(LANGUAGE_HEADER));
});

/** The reader's language and words for a server component, as `useTranslation()` gives them to a client one. */
export async function getTranslation(): Promise<ServerTranslator & { language: Language }> {
  const language = await getLanguage();
  return { language, ...serverTranslator(language) };
}
