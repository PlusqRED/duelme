import { GAME_GUIDES } from '@/content/gameGuides';

/**
 * The pages a search engine should list, by their English address: a game's only with its guide.
 * The sitemap lists them, and every other page's head tags keep it out of search results — a
 * player's, a duel's, a new page until it is added here.
 */
export const INDEXED_PAGES: readonly string[] = [
  '/',
  '/games',
  ...GAME_GUIDES.map((guide) => `/games/${guide.slug}`),
  '/duels/public',
  '/duels/recent',
  '/duel/create',
  '/how-it-works',
  '/safety',
  '/about',
  '/privacy',
];

export function isIndexed(path: string): boolean {
  return INDEXED_PAGES.includes(path);
}
