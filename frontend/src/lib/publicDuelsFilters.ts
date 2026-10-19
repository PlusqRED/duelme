import type { DuelMeta, GameCategory } from './game';
import type { ReputationSummary } from './reputation';
import type { Language } from '@/i18n/translations';
import { perLanguage } from '@/lib/utils';

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
  reputationStatsByAddress: Record<string, ReputationSummary>;
}

export function enrichPublicDuel({
  duel,
  meta,
  resolveDisplay,
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

const amountFormats = perLanguage((locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }));

export function formatPublicDuelAmount(value: number, language: Language): string {
  return amountFormats[language].format(value);
}
