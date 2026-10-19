import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_COOKIE } from '@/i18n/language';
import { translations } from '@/i18n/translations';

const requestCookies = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (requestCookies.has(name) ? { name, value: requestCookies.get(name) } : undefined),
  }),
}));

const { getLanguage, getTranslation } = await import('@/i18n/serverTranslation');

afterEach(() => requestCookies.clear());

describe('getLanguage', () => {
  it('reads the language from the cookie', async () => {
    requestCookies.set(LANGUAGE_COOKIE, 'ru');

    expect(await getLanguage()).toBe('ru');
  });

  it('is English without the cookie', async () => {
    expect(await getLanguage()).toBe('en');
  });

  it('is English for a value it does not know', async () => {
    requestCookies.set(LANGUAGE_COOKIE, 'xx');

    expect(await getLanguage()).toBe('en');
  });
});

describe('getTranslation', () => {
  it('speaks the cookie\'s language', async () => {
    requestCookies.set(LANGUAGE_COOKIE, 'ru');

    const { t } = await getTranslation();

    expect(t('footer.rights')).toBe(translations.ru['footer.rights']);
  });
});
