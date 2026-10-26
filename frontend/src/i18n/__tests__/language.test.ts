import { describe, expect, it } from 'vitest';
import { isLanguage, LANGUAGES, parseLanguage } from '@/i18n/language';
import { translations } from '@/i18n/translations';

describe('parseLanguage', () => {
  it.each(['en', 'ru'] as const)('keeps %s', (language) => {
    expect(parseLanguage(language)).toBe(language);
  });

  it.each([undefined, null, '', 'de', 'RU', 'ru ', 'constructor', '__proto__', ['ru'], 7])(
    'reads %j as English, since a request may carry anything',
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

describe('LANGUAGES', () => {
  it('offers every language the app is translated into', () => {
    expect([...LANGUAGES].sort()).toEqual(Object.keys(translations).sort());
  });
});
