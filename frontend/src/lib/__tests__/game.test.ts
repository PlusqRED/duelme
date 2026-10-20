import { describe, expect, it } from 'vitest';
import { translations } from '@/i18n/translations';
import { byPopularity, getCategoryLabelKey, GAME_CATEGORIES } from '@/lib/game';

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
