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
