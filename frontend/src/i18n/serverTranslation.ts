import { cookies } from 'next/headers';
import { LANGUAGE_COOKIE, parseLanguage } from './language';
import { translator, type Translator } from './translate';
import type { Language } from './translations';

/** The reader's language, from the cookie the language switch writes. */
export async function getLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  return parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value);
}

/** What `useTranslation()` gives a client component, for a server component. */
export async function getTranslation(): Promise<Translator & { language: Language }> {
  const language = await getLanguage();
  return { language, ...translator(language) };
}
