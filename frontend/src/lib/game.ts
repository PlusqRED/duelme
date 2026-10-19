import type { TranslationKey } from '@/i18n/translations';

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
