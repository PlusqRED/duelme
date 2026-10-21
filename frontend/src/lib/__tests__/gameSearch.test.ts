import { describe, it, expect } from 'vitest';
import type { Game } from '../game';
import {
  createGameSearcher,
  buildHighlightSet,
  findGameByName,
  gamesOnOffer,
  highlightRuns,
  normalizeGameName,
} from '../gameSearch';

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

describe('createGameSearcher', () => {
  it('returns empty list for blank query', () => {
    expect(createGameSearcher(CATALOG).search('')).toEqual([]);
    expect(createGameSearcher(CATALOG).search('   ')).toEqual([]);
  });

  it('finds an exact substring match', () => {
    const results = createGameSearcher(CATALOG).search('Valorant');
    expect(results[0]?.game.slug).toBe('valorant');
  });

  it('tolerates a single-character typo (Valoront -> Valorant)', () => {
    const results = createGameSearcher(CATALOG).search('Valoront');
    expect(results[0]?.game.slug).toBe('valorant');
  });

  it('matches across spaces (dot 2 -> Dota 2)', () => {
    const results = createGameSearcher(CATALOG).search('dot 2');
    expect(results.map((r) => r.game.slug)).toContain('dota-2');
  });

  it('returns no results for nonsense queries', () => {
    expect(createGameSearcher(CATALOG).search('qwerty zzz xyz')).toEqual([]);
  });

  it('respects the limit', () => {
    const results = createGameSearcher(CATALOG).search('o', 1);
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

describe('highlightRuns', () => {
  it('splits a name into the matched letters and the rest', () => {
    const runs = highlightRuns('Dota 2', [[0, 2]]);

    expect(runs).toEqual([
      { text: 'Dot', isMatch: true },
      { text: 'a 2', isMatch: false },
    ]);
  });

  it('leaves a name with no match as one run', () => {
    expect(highlightRuns('Chess', [])).toEqual([{ text: 'Chess', isMatch: false }]);
  });
});

describe('normalizeGameName', () => {
  it('ignores case, spaces and punctuation', () => {
    expect(normalizeGameName(' CS: 2 ')).toBe('cs2');
  });

  it('keeps letters of any script', () => {
    expect(normalizeGameName('Шахматы 960')).toBe('шахматы960');
  });
});

describe('findGameByName', () => {
  it('finds a game however its name is spelled', () => {
    expect(findGameByName(CATALOG, 'counter strike 2')).toBe(CS2);
  });

  it('finds nothing for a game the catalog lacks', () => {
    expect(findGameByName(CATALOG, 'Valorant Mobile')).toBeUndefined();
  });

  it('finds nothing for a name of punctuation alone', () => {
    expect(findGameByName([{ name: '!!' }], '?')).toBeUndefined();
  });
});

describe('gamesOnOffer', () => {
  it('offers the most played games first', () => {
    expect(gamesOnOffer(CATALOG, null, 2)).toEqual([CS2, VALORANT]);
  });

  it('adds the picked game when it is not among them', () => {
    expect(gamesOnOffer(CATALOG, DOTA2, 2)).toEqual([CS2, VALORANT, DOTA2]);
  });

  it('does not repeat a picked game that is among them', () => {
    expect(gamesOnOffer(CATALOG, VALORANT, 2)).toEqual([CS2, VALORANT]);
  });

  it('orders games played as often by name', () => {
    const tie = [{ ...DOTA2, duelCount: 30 }, CS2];

    expect(gamesOnOffer(tie, null, 2).map((game) => game.name)).toEqual(['Counter-Strike 2', 'Dota 2']);
  });
});
