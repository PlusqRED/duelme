import { headers } from 'next/headers';
import { cache } from 'react';
import { LANGUAGE_HEADER, parseLanguage } from './language';
import { translator, type Translator } from './translate';
import type { Language } from './translations';

/**
 * The page's language, from its address: `proxy.ts` reads it there and hands it on in a request
 * header. Read once per request, however many server parts ask.
 */
export const getLanguage = cache(async (): Promise<Language> => {
  const requestHeaders = await headers();
  return parseLanguage(requestHeaders.get(LANGUAGE_HEADER));
});

/** The reader's words for a server component, as `useTranslation()` gives them to a client one. */
export async function getTranslation(): Promise<Translator> {
  return translator(await getLanguage());
}
