import { describe, expect, it } from 'vitest';
import { isLanguage, LANGUAGE_COOKIE, parseLanguage, readLanguageCookie } from '@/i18n/language';

describe('parseLanguage', () => {
  it.each(['en', 'ru'] as const)('keeps %s', (language) => {
    expect(parseLanguage(language)).toBe(language);
  });

  it.each([undefined, null, '', 'de', 'RU', 'ru ', 'constructor', '__proto__', ['ru'], 7])(
    'reads %j as English, since the browser may send anything',
    (value) => {
      expect(parseLanguage(value)).toBe('en');
    }
  );
});

describe('isLanguage', () => {
  it.each(['en', 'ru'])('knows %s', (value) => {
    expect(isLanguage(value)).toBe(true);
  });

  it.each([undefined, null, '', 'de', 'RU', 'constructor', '__proto__', ['ru'], 7])('does not take %j', (value) => {
    expect(isLanguage(value)).toBe(false);
  });
});

describe('readLanguageCookie', () => {
  it('finds the language among the page’s other cookies', () => {
    expect(readLanguageCookie(`theme=dark; ${LANGUAGE_COOKIE}=ru; other=1`)).toBe('ru');
  });

  it('is undefined without the cookie', () => {
    expect(readLanguageCookie('theme=dark')).toBeUndefined();
  });

  it('is not fooled by a cookie whose name only ends like it', () => {
    expect(readLanguageCookie(`x${LANGUAGE_COOKIE}=ru`)).toBeUndefined();
  });
});
