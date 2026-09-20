import { describe, expect, it } from 'vitest';
import { pluralize } from '@/i18n/pluralize';

/**
 * The badge used to read "1 duels": one fixed word concatenated to a number. These pin the
 * forms the languages actually select, which is the part a hand-written `count === 1` gets
 * wrong the moment it meets Russian.
 */
describe('pluralize', () => {
  it('gives English a singular only at one', () => {
    expect(pluralize('en', 'games.duelsCount', 1)).toBe('duel');
    for (const count of [0, 2, 5, 11, 21, 101]) {
      expect(pluralize('en', 'games.duelsCount', count)).toBe('duels');
    }
  });

  it('gives Russian its three forms by the last digit', () => {
    expect(pluralize('ru', 'games.duelsCount', 1)).toBe('дуэль');
    expect(pluralize('ru', 'games.duelsCount', 2)).toBe('дуэли');
    expect(pluralize('ru', 'games.duelsCount', 4)).toBe('дуэли');
    expect(pluralize('ru', 'games.duelsCount', 5)).toBe('дуэлей');
    expect(pluralize('ru', 'games.duelsCount', 0)).toBe('дуэлей');
  });

  it('keeps the Russian 11-14 exception, where the last digit lies', () => {
    // 21 ends in 1 and takes the singular; 11 ends in 1 and does not.
    expect(pluralize('ru', 'games.duelsCount', 21)).toBe('дуэль');
    expect(pluralize('ru', 'games.duelsCount', 101)).toBe('дуэль');
    expect(pluralize('ru', 'games.duelsCount', 11)).toBe('дуэлей');
    expect(pluralize('ru', 'games.duelsCount', 12)).toBe('дуэлей');
    expect(pluralize('ru', 'games.duelsCount', 14)).toBe('дуэлей');
    expect(pluralize('ru', 'games.duelsCount', 111)).toBe('дуэлей');
  });

  it('never renders the key itself — every language defines the fallback form', () => {
    for (const language of ['en', 'ru'] as const) {
      for (const count of [0, 1, 2, 5, 11, 22, 100]) {
        expect(pluralize(language, 'games.duelsCount', count)).not.toContain('games.');
      }
    }
  });
});
