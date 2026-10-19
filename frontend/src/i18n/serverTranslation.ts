import { cookies } from 'next/headers';
import { LANGUAGE_COOKIE, parseLanguage } from './language';
import { translator, type Translator } from './translate';
import type { Language } from './translations';

/** The reader's language, from the cookie the language switch writes. */
export async function getLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  return parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value);
}

/** The reader's words for a server component, as `useTranslation()` gives them to a client one. */
export async function getTranslation(): Promise<Translator> {
  return translator(await getLanguage());
}
