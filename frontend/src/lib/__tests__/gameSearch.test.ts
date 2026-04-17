import { describe, it, expect } from 'vitest';
import type { Game } from '../game';
import { buildHighlightSet, searchGames } from '../gameSearch';

const VALORANT: Game = {
  slug: 'valorant',
  name: 'Valorant',
  iconUrl: null,
  category: 'FPS',
  duelCount: 12,
  createdAt: null,
  updatedAt: null,
};

const CS2: Game = {
  slug: 'cs2',
  name: 'Counter-Strike 2',
  iconUrl: null,
  category: 'FPS',
  duelCount: 30,
  createdAt: null,
  updatedAt: null,
};

const DOTA2: Game = {
  slug: 'dota-2',
  name: 'Dota 2',
  iconUrl: null,
  category: 'MOBA',
  duelCount: 5,
  createdAt: null,
  updatedAt: null,
};

const CATALOG: Game[] = [VALORANT, CS2, DOTA2];

describe('searchGames', () => {
  it('returns empty list for blank query', () => {
    expect(searchGames(CATALOG, '')).toEqual([]);
    expect(searchGames(CATALOG, '   ')).toEqual([]);
  });

  it('finds an exact substring match', () => {
    const results = searchGames(CATALOG, 'Valorant');
    expect(results[0]?.game.slug).toBe('valorant');
  });

  it('tolerates a single-character typo (Valoront -> Valorant)', () => {
    const results = searchGames(CATALOG, 'Valoront');
    expect(results[0]?.game.slug).toBe('valorant');
  });

  it('matches across spaces (dot 2 -> Dota 2)', () => {
    const results = searchGames(CATALOG, 'dot 2');
    expect(results.map((r) => r.game.slug)).toContain('dota-2');
  });

  it('returns no results for nonsense queries', () => {
    expect(searchGames(CATALOG, 'qwerty zzz xyz')).toEqual([]);
  });

  it('respects the limit', () => {
    const results = searchGames(CATALOG, 'o', 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });
});

describe('buildHighlightSet', () => {
  it('expands index ranges into a set of inclusive positions', () => {
    expect(Array.from(buildHighlightSet([[0, 2]])).sort()).toEqual([0, 1, 2]);
  });

  it('returns an empty set for no matches', () => {
    expect(buildHighlightSet([]).size).toBe(0);
  });

  it('merges multiple ranges', () => {
    const set = buildHighlightSet([
      [0, 1],
      [3, 4],
    ]);
    expect(Array.from(set).sort()).toEqual([0, 1, 3, 4]);
  });
});
