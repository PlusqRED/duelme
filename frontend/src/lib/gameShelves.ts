import { byPopularity, GAME_CATEGORIES, normalizeGameName, type Game, type GameCategory } from '@/lib/game';

/** One category's games on the catalog page, the most played first. */
export interface Shelf {
  category: GameCategory;
  games: Game[];
}

/**
 * The games the catalog page shows, those whose name holds the search however it is spelled: the
 * catalog's, with any guide's game it lacks beside them. Until the catalog answers, the guides'
 * games alone, which the server draws, so a search engine reads them all.
 */
export function catalogGames(catalog: readonly Game[], guides: readonly Game[], search: string): Game[] {
  const known = new Set(catalog.map((game) => game.slug));
  const wanted = normalizeGameName(search);
  return [...catalog, ...guides.filter((guide) => !known.has(guide.slug))].filter((game) =>
    normalizeGameName(game.name).includes(wanted)
  );
}

/** The games by category, in the categories' order, each played most first; a category with none is left out. */
export function shelvesOf(games: readonly Game[]): Shelf[] {
  return GAME_CATEGORIES.map((category) => ({
    category,
    games: games.filter((game) => game.category === category).sort(byPopularity),
  })).filter((shelf) => shelf.games.length > 0);
}

/** The game played most of all, which wears the trophy; none before anyone has played. */
export function mostPlayed(games: readonly Game[]): Game | null {
  return games.reduce<Game | null>((top, game) => (game.duelCount > (top?.duelCount ?? 0) ? game : top), null);
}
