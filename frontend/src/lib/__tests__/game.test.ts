import { describe, expect, it } from 'vitest';
import { translations } from '@/i18n/translations';
import { byPopularity, getCategoryLabelKey, GAME_CATEGORIES, isGame, uncataloguedGame } from '@/lib/game';

describe('getCategoryLabelKey', () => {
  it('names the category’s translation key', () => {
    expect(getCategoryLabelKey('FPS')).toBe('category.FPS');
  });

  it('has a name in both languages for every category', () => {
    const keys = GAME_CATEGORIES.map(getCategoryLabelKey);

    expect(keys.filter((key) => !translations.en[key] || !translations.ru[key])).toEqual([]);
  });
});

describe('byPopularity', () => {
  const game = (name: string, duelCount: number) => ({
    slug: name.toLowerCase(),
    name,
    iconUrl: null,
    category: 'OTHER' as const,
    duelCount,
    createdAt: null,
    updatedAt: null,
  });

  it('puts the game with more duels first', () => {
    expect([game('Chess', 1), game('Dota 2', 3)].sort(byPopularity).map((each) => each.name)).toEqual(['Dota 2', 'Chess']);
  });

  it('orders games played as often by name', () => {
    expect([game('Dota 2', 2), game('CS 2', 2)].sort(byPopularity).map((each) => each.name)).toEqual(['CS 2', 'Dota 2']);
  });
});

describe('uncataloguedGame', () => {
  it('makes a game nobody has duelled in, with nothing the catalog has yet to say', () => {
    expect(uncataloguedGame({ slug: 'cs2', name: 'CS2', category: 'FPS' })).toEqual({
      slug: 'cs2',
      name: 'CS2',
      iconUrl: null,
      category: 'FPS',
      duelCount: 0,
      createdAt: null,
      updatedAt: null,
    });
  });
});

describe('isGame', () => {
  const chess = { slug: 'chess', name: 'Chess', iconUrl: null, category: 'STRATEGY', duelCount: 2, createdAt: null, updatedAt: '2026-10-26' };

  it('takes a game as the API sends one', () => {
    expect(isGame(chess)).toBe(true);
  });

  it.each([
    ['an error body', { error: 'Bad gateway' }],
    ['a game with no name', { ...chess, name: undefined }],
    ['a game of a category the site does not know', { ...chess, category: 'PUZZLE' }],
    ['a count that is not a number', { ...chess, duelCount: '2' }],
    ['nothing', null],
  ])('refuses %s', (_, value) => {
    expect(isGame(value)).toBe(false);
  });
});
