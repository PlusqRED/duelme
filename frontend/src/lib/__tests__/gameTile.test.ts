import { describe, expect, it, vi } from 'vitest';
import { themeTokens } from '@/lib/__tests__/helpers/sourceFiles';
import { GAME_TONES, gameInitials, gameInk } from '@/lib/gameTile';

describe('gameInitials', () => {
  it.each([
    ['CS2', 'CS2'],
    ['EA FC 25', 'EA'],
    ['PUBG Mobile', 'PM'],
    ['Valorant', 'VA'],
    ['Dota 2', 'D2'],
    ['League of Legends', 'LO'],
    ['  rocket   league ', 'RL'],
  ])('shows %s as %s', (name, initials) => {
    expect(gameInitials(name)).toBe(initials);
  });

  it('keeps a character outside the basic plane whole', () => {
    expect([gameInitials('🔥 Fire Arena'), gameInitials('𝕏Game')]).toEqual(['🔥F', '𝕏G']);
  });

  it('keeps a flag or a family of people one character', () => {
    expect([gameInitials('🇺🇸 Game'), gameInitials('👨‍👩‍👧 Club')]).toEqual(['🇺🇸G', '👨‍👩‍👧C']);
  });

  it('keeps a letter that upper case would turn into two', () => {
    expect(gameInitials('ßeta Game')).toBe('ßG');
  });

  it('still draws initials in a browser without Intl.Segmenter', async () => {
    // Intl's members are not enumerable, so a spread would drop them all: inherit them instead.
    vi.stubGlobal('Intl', Object.assign(Object.create(Intl), { Segmenter: undefined }));
    vi.resetModules();
    try {
      const { gameInitials: initialsWithout } = await import('@/lib/gameTile');

      expect([initialsWithout('🔥 Fire Arena'), initialsWithout('Dota 2')]).toEqual(['🔥F', 'D2']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('shows nothing for a name of blanks', () => {
    expect(gameInitials('   ')).toBe('');
  });
});

describe('GAME_TONES', () => {
  const colours = themeTokens('color');

  it.each(Object.entries(GAME_TONES))('gives %s a tile and an ink the theme has', (category, tone) => {
    const name = category.toLowerCase();

    expect(tone.tile).toBe(`bg-game-${name} text-game-${name}-ink`);
    expect(tone.ink).toBe(`var(--color-game-${name}-ink)`);
    expect([colours.has(`game-${name}`), colours.has(`game-${name}-ink`)]).toEqual([true, true]);
  });
});

describe('gameInk', () => {
  it('reads the ink of the category’s tile from the theme', () => {
    expect(gameInk('FIGHTING')).toBe('var(--color-game-fighting-ink)');
  });

  it('falls back to the page’s ink without a category', () => {
    expect([gameInk(null), gameInk(undefined)]).toEqual(['var(--color-ink)', 'var(--color-ink)']);
  });
});
