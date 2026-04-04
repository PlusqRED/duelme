export type GameCategory = 'FPS' | 'MOBA' | 'SPORT' | 'STRATEGY' | 'FIGHTING' | 'RACING' | 'CARD' | 'OTHER';

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
  gameSlug: string;
  gameName: string;
  creatorAddress: string;
  createdAt: string | null;
}

export const GAME_CATEGORIES: GameCategory[] = [
  'FPS', 'MOBA', 'SPORT', 'STRATEGY', 'FIGHTING', 'RACING', 'CARD', 'OTHER',
];
