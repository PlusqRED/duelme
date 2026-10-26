import type { TranslationKey } from '@/i18n/translations';
import { isRecord } from '@/lib/parsing';

export type GameCategory = 'FPS' | 'MOBA' | 'SPORT' | 'STRATEGY' | 'FIGHTING' | 'RACING' | 'CARD' | 'OTHER';

/** A category's name as the screens write it. */
export function getCategoryLabelKey(category: GameCategory): TranslationKey {
  return `category.${category}`;
}

export interface Game {
  slug: string;
  name: string;
  iconUrl: string | null;
  category: GameCategory;
  duelCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DuelMeta {
  duelId: number;
  chainId: number;
  /** The DuelMe deployment this duel lives in — part of its identity, since ids restart at zero on a redeploy. */
  contractAddress: string;
  gameSlug: string;
  gameName: string;
  category: GameCategory | null;
  creatorAddress: string;
  createdAt: string | null;
}

export const GAME_CATEGORIES: GameCategory[] = [
  'FPS', 'MOBA', 'SPORT', 'STRATEGY', 'FIGHTING', 'RACING', 'CARD', 'OTHER',
];

/** The games played most first; of games played as often, by name. */
export function byPopularity(a: Game, b: Game): number {
  return b.duelCount - a.duelCount || a.name.localeCompare(b.name);
}

/**
 * What a game page knows of its game before the browser reads anything: the game the server settled
 * (the catalog's, or a guide's the catalog lacks), or nothing yet, with a guide's game to show while
 * the browser reads it.
 */
export type KnownGame = { status: 'settled'; game: Game } | { status: 'unsettled'; fallback?: Game };

/** A game the catalog does not have yet, so nobody has duelled in it: one a guide names, or a player adds. */
export function uncataloguedGame({ slug, name, category }: Pick<Game, 'slug' | 'name' | 'category'>): Game {
  return { slug, name, iconUrl: null, category, duelCount: 0, createdAt: null, updatedAt: null };
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/** A game as the API sends one: what a response holds is checked before a page renders it. */
export function isGame(value: unknown): value is Game {
  return (
    isRecord(value) &&
    typeof value.slug === 'string' &&
    typeof value.name === 'string' &&
    isNullableString(value.iconUrl) &&
    GAME_CATEGORIES.some((category) => category === value.category) &&
    typeof value.duelCount === 'number' &&
    isNullableString(value.createdAt) &&
    isNullableString(value.updatedAt)
  );
}
