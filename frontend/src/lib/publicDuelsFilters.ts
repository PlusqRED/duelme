import { parseUnits } from 'viem';
import { USDT_DECIMALS, ZERO_ADDRESS } from '@/lib/constants';
import { DuelState } from '@/lib/contracts';
import type { DuelRecord } from '@/lib/duel';
import { isPublicDuel } from '@/lib/invite';
import type { DuelMeta, GameCategory } from './game';
import type { ReputationSummary } from './reputation';

/** An open public duel: one anybody may join, waiting for its opponent. */
export interface PublicDuel {
  id: number;
  creator: `0x${string}`;
  /** The stake in USDT's base units. */
  wagerAmount: bigint;
  message: string;
  createdAt: bigint;
  chainId: number;
}

/**
 * The open public duels among `records`, newest first. A duel can carry no invite hash and still be
 * addressed to one player: listing it would offer everyone else a Join that reverts "Not the
 * invited opponent".
 */
export function openPublicDuelsOf(records: readonly DuelRecord[], chainId: number): PublicDuel[] {
  return records
    .filter(
      (record) =>
        record.state === DuelState.Created &&
        isPublicDuel(record.inviteHash) &&
        record.invitedOpponent === ZERO_ADDRESS
    )
    .map((record) => ({
      id: record.id,
      creator: record.creator,
      wagerAmount: record.wagerAmount,
      message: record.message,
      createdAt: record.createdAt,
      chainId,
    }))
    .sort((a, b) => b.id - a.id);
}

export interface EnrichedDuel {
  id: number;
  creator: `0x${string}`;
  /** The stake each player puts in, in USDT's base units. */
  wagerAmount: bigint;
  message: string;
  createdAt: bigint;
  chainId: number;
  gameName: string | null;
  gameSlug: string | null;
  gameCategory: GameCategory | null;
  creatorName: string;
  reputationStats: ReputationSummary | undefined;
}

interface EnrichPublicDuelOptions {
  duel: PublicDuel;
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
  return {
    id: duel.id,
    creator: duel.creator,
    wagerAmount: duel.wagerAmount,
    message: duel.message,
    createdAt: duel.createdAt,
    chainId: duel.chainId,
    gameName: meta?.gameName ?? null,
    gameSlug: meta?.gameSlug ?? null,
    gameCategory: meta?.category ?? null,
    creatorName: resolveDisplay(duel.creator),
    reputationStats: reputationStatsByAddress[duel.creator.toLowerCase()],
  };
}

/** The stake bands the open duels filter by, smallest first. */
export const STAKE_BANDS = ['under10', '10to50', '50to100', 'over100'] as const;
export type StakeBand = (typeof STAKE_BANDS)[number];

/** Each band as the filter writes it: plain figures, the same in every language. */
export const STAKE_BAND_LABELS: Record<StakeBand, string> = {
  under10: '< 10',
  '10to50': '10–50',
  '50to100': '50–100',
  over100: '100+',
};

const TEN = parseUnits('10', USDT_DECIMALS);
const FIFTY = parseUnits('50', USDT_DECIMALS);
const HUNDRED = parseUnits('100', USDT_DECIMALS);

/** The band a stake falls in: under 10, 10 to 50 and 50 to 100 with their upper ends, or over 100. */
export function stakeBandOf(amount: bigint): StakeBand {
  if (amount < TEN) return 'under10';
  if (amount <= FIFTY) return '10to50';
  if (amount <= HUNDRED) return '50to100';
  return 'over100';
}

/** The filter value for duels created without a game, which a game's slug can never be. */
export const NO_GAME = '__none__';

export interface OpenDuelsFilter {
  /** A game's slug, `NO_GAME`, or null for every game. */
  game: string | null;
  /** A stake band, or null for any stake. */
  stake: StakeBand | null;
  /** The search as `normalizeSearchQuery` folds it. */
  normalizedQuery: string;
}

/** The open duels a filter keeps, newest first as given; `textById` is each duel's search text. */
export function filterOpenDuels(
  duels: readonly EnrichedDuel[],
  filter: OpenDuelsFilter,
  textById: ReadonlyMap<number, string>
): EnrichedDuel[] {
  return duels.filter(
    (duel) =>
      (filter.game === null || (duel.gameSlug ?? NO_GAME) === filter.game) &&
      (filter.stake === null || stakeBandOf(duel.wagerAmount) === filter.stake) &&
      (!filter.normalizedQuery || (textById.get(duel.id) ?? '').includes(filter.normalizedQuery))
  );
}

export interface OpenDuelGame {
  /** The game's slug, or `NO_GAME` for the duels created without one. */
  slug: string;
  /** Null for the duels created without a game. */
  name: string | null;
  category: GameCategory | null;
  count: number;
}

/** The games the open duels are in, the one with the most first, the duels without a game last. */
export function openDuelGames(duels: readonly EnrichedDuel[]): OpenDuelGame[] {
  const games = new Map<string, OpenDuelGame>();
  for (const duel of duels) {
    const slug = duel.gameSlug ?? NO_GAME;
    const game = games.get(slug) ?? { slug, name: duel.gameName, category: duel.gameCategory, count: 0 };
    games.set(slug, { ...game, count: game.count + 1 });
  }
  return [...games.values()].sort((a, b) => {
    if ((a.slug === NO_GAME) !== (b.slug === NO_GAME)) return a.slug === NO_GAME ? 1 : -1;
    return b.count - a.count;
  });
}
