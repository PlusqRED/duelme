import { describe, expect, it } from 'vitest';
import { LANGUAGE_COOKIE, parseLanguage, readLanguageCookie } from '@/i18n/language';

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

describe('readLanguageCookie', () => {
  it('finds the language among the page’s other cookies', () => {
    expect(readLanguageCookie(`theme=dark; ${LANGUAGE_COOKIE}=ru; other=1`)).toBe('ru');
  });

  it('is undefined without the cookie, and not fooled by a name that only ends like it', () => {
    expect([readLanguageCookie(''), readLanguageCookie(`x${LANGUAGE_COOKIE}=ru`)]).toEqual([undefined, undefined]);
  });
});
