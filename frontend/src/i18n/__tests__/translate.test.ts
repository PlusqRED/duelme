import { describe, expect, it } from 'vitest';
import { translator } from '@/i18n/translate';
import { translations } from '@/i18n/translations';

describe('translator', () => {
  it('gives each language its own words', () => {
    expect(translator('ru').t('footer.rights')).toBe(translations.ru['footer.rights']);
    expect(translator('en').t('footer.rights')).toBe(translations.en['footer.rights']);
  });

  it('fills each placeholder', () => {
    expect(translator('en').t('profile.charCount', { count: 3, max: 40 })).toBe(
      translations.en['profile.charCount'].replace('{count}', '3').replace('{max}', '40')
    );
  });

  it('leaves a placeholder it has no value for', () => {
    expect(translator('en').t('profile.charCount', { count: 3 })).toContain('{max}');
  });

  it('picks a plural form by the language\'s rules', () => {
    expect(translator('ru').plural('games.duelsCount', 11)).toBe(translations.ru['games.duelsCount.many']);
    expect(translator('ru').plural('games.duelsCount', 21)).toBe(translations.ru['games.duelsCount.one']);
  });
});
