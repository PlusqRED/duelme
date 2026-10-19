import { describe, expect, it } from 'vitest';
import { translations } from '@/i18n/translations';
import { getCategoryLabelKey, GAME_CATEGORIES } from '@/lib/game';

describe('getCategoryLabelKey', () => {
  it('names the category’s translation key', () => {
    expect(getCategoryLabelKey('FPS')).toBe('category.FPS');
  });

  it('has a name in both languages for every category', () => {
    const keys = GAME_CATEGORIES.map(getCategoryLabelKey);

    expect(keys.filter((key) => !translations.en[key] || !translations.ru[key])).toEqual([]);
  });
});
