import type { DuelMeta, GameCategory } from './game';
import type { ReputationLevel, ReputationSummary } from './reputation';

export type SortBy = 'newest' | 'highest' | 'lowest';
export type WagerRange = 'all' | 'under10' | '10to50' | '50to100' | 'over100';

export const NO_GAME_FILTER = '__none__';

export interface EnrichedDuel {
  id: number;
  creator: `0x${string}`;
  wager: number;
  message: string;
  createdAt: bigint;
  chainId: number;
  gameName: string | null;
  gameSlug: string | null;
  gameCategory: GameCategory | null;
  creatorName: string;
  reputation: ReputationLevel | undefined;
  reputationStats: ReputationSummary | undefined;
}

type PublicDuelInput = Pick<
  EnrichedDuel,
  'id' | 'creator' | 'wager' | 'message' | 'createdAt' | 'chainId'
>;

interface EnrichPublicDuelOptions {
  duel: PublicDuelInput;
  meta: DuelMeta | undefined;
  resolveDisplay: (address: string) => string;
  reputationByAddress: Record<string, ReputationLevel>;
  reputationStatsByAddress: Record<string, ReputationSummary>;
}

export function enrichPublicDuel({
  duel,
  meta,
  resolveDisplay,
  reputationByAddress,
  reputationStatsByAddress,
}: EnrichPublicDuelOptions): EnrichedDuel {
  const addressKey = duel.creator.toLowerCase();

  return {
    id: duel.id,
    creator: duel.creator,
    wager: duel.wager,
    message: duel.message,
    createdAt: duel.createdAt,
    chainId: duel.chainId,
    gameName: meta?.gameName ?? null,
    gameSlug: meta?.gameSlug ?? null,
    gameCategory: meta?.category ?? null,
    creatorName: resolveDisplay(duel.creator),
    reputation: reputationByAddress[addressKey],
    reputationStats: reputationStatsByAddress[addressKey],
  };
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

export function formatPublicDuelAmount(value: number, language: 'en' | 'ru'): string {
  return new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}
