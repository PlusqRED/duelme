import { GAME_GUIDES } from '@/content/gameGuides';
import type { Language } from '@/i18n/translations';
import type { GameCategory } from '@/lib/game';

/** One part of a game's guide: how its duels are played, set up or settled. */
export interface GameGuideSection {
  heading: string;
  text: string;
}

/** A game's guide in one language. */
export interface GameGuideCopy {
  /** The page's title in search results, under 50 characters: the layout adds the site's name. */
  title: string;
  /** The result's description, under 160 characters, the length a result shows whole. */
  description: string;
  /** What a duel in this game is, under the page's heading. */
  lead: string;
  sections: readonly GameGuideSection[];
}

/**
 * What DuelMe says about duels in one game: the pages search engines list. A game players add by
 * naming it in a duel has a page too, but no guide, and stays out of search results: a page with a
 * name and an empty list is no answer to anyone's search.
 */
export interface GameGuide {
  /** The catalog's slug for the game, the one the backend makes from `name`. */
  slug: string;
  name: string;
  category: GameCategory;
  copy: Record<Language, GameGuideCopy>;
}

export function gameGuide(slug: string): GameGuide | null {
  return GAME_GUIDES.find((guide) => guide.slug === slug) ?? null;
}

/**
 * The guides a short row offers, the landing's: the most searched game of every category first, so
 * the row shows how far the catalog reaches beyond video games, then the most searched of the rest,
 * up to `count`, in the guides' own order.
 */
export function featuredGuides(count: number): GameGuide[] {
  const leaders = GAME_GUIDES.filter(
    (guide, index) => GAME_GUIDES.findIndex(({ category }) => category === guide.category) === index
  );
  const picked = new Set(leaders.slice(0, count));
  for (const guide of GAME_GUIDES) {
    if (picked.size >= count) break;
    picked.add(guide);
  }
  return GAME_GUIDES.filter((guide) => picked.has(guide));
}

/** The guides under a game's page: its category's first, then the most searched, up to `count`, never its own. */
export function relatedGuides(slug: string, category: GameCategory | undefined, count: number): GameGuide[] {
  const others = GAME_GUIDES.filter((guide) => guide.slug !== slug);
  const kin = others.filter((guide) => guide.category === category);
  return [...kin, ...others.filter((guide) => guide.category !== category)].slice(0, count);
}
