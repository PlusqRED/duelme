import { byPopularity, GAME_CATEGORIES, uncataloguedGame, type Game, type GameCategory } from '@/lib/game';
import { normalizeGameName } from '@/lib/gameSearch';

/** What the catalog page needs of a guide: the game it stands for. The guides' words stay on the server. */
export type ShelfGuide = Pick<Game, 'slug' | 'name' | 'category'>;

/** One category's games on the catalog page, the most played first. */
export interface Shelf {
  category: GameCategory;
  games: Game[];
}

/**
 * The games the catalog page shows. Until the catalog answers (`read` undefined), the guides' games,
 * narrowed by the search here: the page the server draws holds every guide, so a search engine reads
 * them all. After, the catalog's, which searches by itself, with any guide's game it lacks beside
 * them as one nobody has played yet.
 */
export function catalogGames(read: readonly Game[] | undefined, guides: readonly ShelfGuide[], search: string): Game[] {
  if (read === undefined) {
    const wanted = normalizeGameName(search);
    return guides.map(uncataloguedGame).filter((game) => normalizeGameName(game.name).includes(wanted));
  }
  // A guide the search left out is not a game the catalog lacks.
  if (search.trim() !== '') return [...read];
  const known = new Set(read.map((game) => game.slug));
  return [...read, ...guides.filter((guide) => !known.has(guide.slug)).map(uncataloguedGame)];
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
