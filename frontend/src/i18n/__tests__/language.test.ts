import { describe, expect, it } from 'vitest';
import { LANGUAGE_COOKIE, languageCookie, parseLanguage } from '@/i18n/language';

describe('parseLanguage', () => {
  it.each(['en', 'ru'] as const)('keeps %s', (language) => {
    expect(parseLanguage(language)).toBe(language);
  });

  it.each([undefined, '', 'de', 'RU', 'ru ', 'constructor', '__proto__'])(
    'reads %j as English, since the browser may send anything',
    (value) => {
      expect(parseLanguage(value)).toBe('en');
    }
  );
});

describe('languageCookie', () => {
  it('keeps the language on every page for a year', () => {
    expect(languageCookie('ru')).toBe(`${LANGUAGE_COOKIE}=ru; path=/; max-age=31536000; samesite=lax`);
  });
});
