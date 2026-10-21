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

export function buildHighlightSet(matches: ReadonlyArray<readonly [number, number]>): Set<number> {
  const set = new Set<number>();
  for (const [start, end] of matches) {
    for (let i = start; i <= end; i += 1) set.add(i);
  }
  return set;
}

/** A name in runs of letters the search matched and letters it did not, for the matched ones to be marked. */
export function highlightRuns(
  name: string,
  matches: ReadonlyArray<readonly [number, number]>
): { text: string; isMatch: boolean }[] {
  const marked = buildHighlightSet(matches);
  const runs: { text: string; isMatch: boolean }[] = [];
  for (let i = 0; i < name.length; i += 1) {
    const isMatch = marked.has(i);
    const last = runs[runs.length - 1];
    if (last && last.isMatch === isMatch) last.text += name[i];
    else runs.push({ text: name[i], isMatch });
  }
  return runs;
}

/** A game's name as two spellings of one game compare: case, spaces and punctuation aside, so «CS 2» is «cs2». */
export function normalizeGameName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

/** The game with this name, however it is spelled. */
export function findGameByName<T extends Pick<Game, 'name'>>(games: ReadonlyArray<T>, name: string): T | undefined {
  const wanted = normalizeGameName(name);
  return wanted ? games.find((game) => normalizeGameName(game.name) === wanted) : undefined;
}

/**
 * What the create page offers before anything is searched: the most played games, then by name, and
 * the picked one after them when it is not among them.
 */
export function gamesOnOffer(games: ReadonlyArray<Game>, picked: Game | null, limit: number): Game[] {
  const popular = [...games].sort((a, b) => b.duelCount - a.duelCount || a.name.localeCompare(b.name)).slice(0, limit);
  return picked && !popular.some((game) => game.slug === picked.slug) ? [...popular, picked] : popular;
}
