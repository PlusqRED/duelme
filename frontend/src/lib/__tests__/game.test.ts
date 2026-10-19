import { describe, expect, it } from 'vitest';
import { translations } from '@/i18n/translations';
import { categoryKey, GAME_CATEGORIES } from '@/lib/game';

describe('categoryKey', () => {
  it('names the category’s translation key', () => {
    expect(categoryKey('FPS')).toBe('category.FPS');
  });

  it('has a name in both languages for every category', () => {
    const keys = GAME_CATEGORIES.map(categoryKey);

    expect(keys.filter((key) => !translations.en[key] || !translations.ru[key])).toEqual([]);
  });
});
