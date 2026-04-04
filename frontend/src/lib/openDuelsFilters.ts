import type { GameCategory } from './game';
import type { ReputationLevel } from './reputation';

export type SortBy = 'newest' | 'highest' | 'lowest';
export type WagerRange = 'all' | 'under10' | '10to50' | '50to100' | 'over100';

export interface EnrichedDuel {
  id: number;
  creator: `0x${string}`;
  wager: number;
  message: string;
  createdAt: bigint;
  chainId: number;
  gameName: string | null;
  gameCategory: GameCategory | null;
  creatorName: string;
  reputation: ReputationLevel | undefined;
}

interface WagerRangeEntry {
  key: WagerRange;
  test: (w: number) => boolean;
}

export const WAGER_RANGES: WagerRangeEntry[] = [
  { key: 'all', test: () => true },
  { key: 'under10', test: (w) => w < 10 },
  { key: '10to50', test: (w) => w >= 10 && w <= 50 },
  { key: '50to100', test: (w) => w > 50 && w <= 100 },
  { key: 'over100', test: (w) => w > 100 },
];

export const WAGER_LABELS: Record<WagerRange, string> = {
  all: '',
  under10: '< 10',
  '10to50': '10\u201350',
  '50to100': '50\u2013100',
  over100: '100+',
};

export const REP_DOT_COLOR: Record<ReputationLevel, string> = {
  new: 'bg-blue-400',
  honorable: 'bg-emerald-400',
  fair: 'bg-amber-400',
  unreliable: 'bg-red-400',
};
