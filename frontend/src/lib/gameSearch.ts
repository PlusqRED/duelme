import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Game } from '@/lib/game';

export interface GameSearchResult {
  game: Game;
  matchIndices: ReadonlyArray<readonly [number, number]>;
}

export interface GameSearcher {
  search(query: string, limit?: number): GameSearchResult[];
}

const FUSE_OPTIONS: IFuseOptions<Game> = {
  keys: ['name'],
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
  includeMatches: true,
  ignoreLocation: false,
};

export function createGameSearcher(games: ReadonlyArray<Game>): GameSearcher {
  const fuse = new Fuse(games as Game[], FUSE_OPTIONS);
  return {
    search(query, limit = 8) {
      const trimmed = query.trim();
      if (!trimmed) return [];
      return fuse.search(trimmed, { limit }).map((result) => ({
        game: result.item,
        matchIndices: result.matches?.[0]?.indices ?? [],
      }));
    },
  };
}

export function searchGames(games: ReadonlyArray<Game>, query: string, limit = 8): GameSearchResult[] {
  return createGameSearcher(games).search(query, limit);
}

export function buildHighlightSet(matches: ReadonlyArray<readonly [number, number]>): Set<number> {
  const set = new Set<number>();
  for (const [start, end] of matches) {
    for (let i = start; i <= end; i += 1) set.add(i);
  }
  return set;
}
