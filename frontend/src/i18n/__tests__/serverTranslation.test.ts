import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_HEADER } from '@/i18n/language';
import { translations } from '@/i18n/translations';

const requestHeaders = new Headers();

vi.mock('next/headers', () => ({ headers: async () => requestHeaders }));

const { getLanguage, getTranslation } = await import('@/i18n/serverTranslation');

afterEach(() => requestHeaders.delete(LANGUAGE_HEADER));

describe('getLanguage', () => {
  it('reads the language the proxy found in the address', () => {
    requestHeaders.set(LANGUAGE_HEADER, 'ru');

    return expect(getLanguage()).resolves.toBe('ru');
  });

  it('is English without the header', () => {
    return expect(getLanguage()).resolves.toBe('en');
  });

  it('is English for a value it does not know', () => {
    requestHeaders.set(LANGUAGE_HEADER, 'xx');

    return expect(getLanguage()).resolves.toBe('en');
  });
});

describe('getTranslation', () => {
  it('speaks the address’s language', async () => {
    requestHeaders.set(LANGUAGE_HEADER, 'ru');

    const { t } = await getTranslation();

    expect(t('footer.rights')).toBe(translations.ru['footer.rights']);
  });
});
