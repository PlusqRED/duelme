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

  it('is the same object every time, so what depends on `t` does not rerun', () => {
    expect(translator('ru')).toBe(translator('ru'));
  });
});

/**
 * The badge used to read "1 duels": one fixed word concatenated to a number. These pin the
 * forms the languages actually select, which is the part a hand-written `count === 1` gets
 * wrong the moment it meets Russian.
 */
describe('plural', () => {
  it('gives English a singular only at one', () => {
    expect(translator('en').plural('games.duelsCount', 1)).toBe('duel');
    for (const count of [0, 2, 5, 11, 21, 101]) {
      expect(translator('en').plural('games.duelsCount', count)).toBe('duels');
    }
  });

  it('gives Russian its three forms by the last digit', () => {
    expect(translator('ru').plural('games.duelsCount', 1)).toBe('дуэль');
    expect(translator('ru').plural('games.duelsCount', 2)).toBe('дуэли');
    expect(translator('ru').plural('games.duelsCount', 4)).toBe('дуэли');
    expect(translator('ru').plural('games.duelsCount', 5)).toBe('дуэлей');
    expect(translator('ru').plural('games.duelsCount', 0)).toBe('дуэлей');
  });

  it('keeps the Russian 11-14 exception, where the last digit lies', () => {
    // 21 ends in 1 and takes the singular; 11 ends in 1 and does not.
    expect(translator('ru').plural('games.duelsCount', 21)).toBe('дуэль');
    expect(translator('ru').plural('games.duelsCount', 101)).toBe('дуэль');
    expect(translator('ru').plural('games.duelsCount', 11)).toBe('дуэлей');
    expect(translator('ru').plural('games.duelsCount', 12)).toBe('дуэлей');
    expect(translator('ru').plural('games.duelsCount', 14)).toBe('дуэлей');
    expect(translator('ru').plural('games.duelsCount', 111)).toBe('дуэлей');
  });

  it('never renders the key itself — every language defines the fallback form', () => {
    for (const language of ['en', 'ru'] as const) {
      for (const count of [0, 1, 2, 5, 11, 22, 100]) {
        expect(translator(language).plural('games.duelsCount', count)).not.toContain('games.');
      }
    }
  });
});
