'use server';

import { cookies } from 'next/headers';
import { LANGUAGE_COOKIE, LANGUAGE_COOKIE_OPTIONS, parseLanguage } from './language';

/**
 * Keeps the reader's language in a cookie the server sets, and answers with the page re-rendered in
 * it. Next keeps a change made this way when a navigation interrupts it, refreshing once that lands,
 * where it drops a plain `router.refresh()`; and Safari keeps a cookie set in a response for its
 * full year, where it caps one a script writes at seven days. Anyone can call an action, so the
 * language is checked like any other input.
 */
export async function saveLanguage(language: string): Promise<void> {
  (await cookies()).set(LANGUAGE_COOKIE, parseLanguage(language), LANGUAGE_COOKIE_OPTIONS);
}
