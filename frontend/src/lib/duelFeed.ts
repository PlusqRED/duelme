import { ZERO_ADDRESS } from '@/lib/constants';
import { DuelState } from '@/lib/contracts';
import { getRelevantDuelTimestamp, type DuelRecord } from '@/lib/duel';
import { RETURNING_PHASES, type DuelPhase } from '@/lib/duelPhase';
import type { DuelMeta } from '@/lib/game';

/** A duel someone joined, newest event first in a feed: the fields a feed row and its filters read. */
export interface RecentDuel {
  id: number;
  player1: `0x${string}`;
  player2: `0x${string}`;
  /** Each player's stake, in USDT's base units. */
  wagerAmount: bigint;
  message: string;
  /** The player a win was reported for, and once the duel is resolved the winner. */
  winner: `0x${string}`;
  /** When the duel last moved, in seconds. */
  lastEventAt: bigint;
  claimTimestamp: bigint;
  state: DuelState;
  creatorPayout: bigint;
  opponentPayout: bigint;
  creatorClaimed: boolean;
  opponentClaimed: boolean;
}

/** A feed's duel with what its row writes beside the contract's fields: the players' names and its game. */
export interface FeedDuel extends RecentDuel {
  creatorName: string;
  opponentName: string;
  /** Unknown until the duel's metadata arrives, and for a duel created without a game. */
  game: DuelMeta | undefined;
}

/**
 * A duel as a feed lists it, or null for one nobody joined: `_duelView` reports no opponent until
 * someone does, so this drops duels still waiting and those cancelled before anyone did. A declined
 * duel names the decliner as its opponent, who never staked, so it goes too.
 */
export function toRecentDuel(record: DuelRecord): RecentDuel | null {
  if (record.opponent === ZERO_ADDRESS || record.state === DuelState.Declined) {
    return null;
  }
  return {
    id: record.id,
    player1: record.creator,
    player2: record.opponent,
    wagerAmount: record.wagerAmount,
    message: record.message,
    winner: record.claimedWinner,
    lastEventAt: getRelevantDuelTimestamp(record),
    claimTimestamp: record.claimTimestamp,
    state: record.state,
    creatorPayout: record.creatorPayout,
    opponentPayout: record.opponentPayout,
    creatorClaimed: record.creatorClaimed,
    opponentClaimed: record.opponentClaimed,
  };
}

/** A feed's duel with its players named, by nickname where they have one, and its game. */
export function toFeedDuel(
  duel: RecentDuel,
  resolveDisplay: (address: string) => string,
  game: DuelMeta | undefined
): FeedDuel {
  return { ...duel, creatorName: resolveDisplay(duel.player1), opponentName: resolveDisplay(duel.player2), game };
}

/** Newest event first; of two duels that moved in the same second, the later one. */
export function byLatestEvent(a: RecentDuel, b: RecentDuel): number {
  if (a.lastEventAt === b.lastEventAt) {
    return b.id - a.id;
  }
  return a.lastEventAt > b.lastEventAt ? -1 : 1;
}

/** The joined duels among `records`, newest event first. */
export function recentDuelsOf(records: readonly DuelRecord[]): RecentDuel[] {
  return records.flatMap((record) => toRecentDuel(record) ?? []).sort(byLatestEvent);
}

/**
 * Where a feed row's money is: paid to the winner, still in the contract while the duel is played,
 * or going back to each player, which a reported win whose time ran out does too.
 */
export type FeedMoney = 'won' | 'held' | 'back';

export function feedMoney(phase: DuelPhase): FeedMoney {
  if (phase === 'resolved') return 'won';
  if (phase === 'timeout' || RETURNING_PHASES.has(phase)) return 'back';
  return 'held';
}

/** The groups a feed filters by, in the order its filters show them. */
export const FEED_FILTERS = ['all', 'live', 'won', 'refunded', 'calledOff', 'disputed'] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];

const STATES_BY_FILTER: Record<FeedFilter, ReadonlySet<DuelState> | null> = {
  all: null,
  // A reported win whose time ran out is still open: its stakes move only once someone refunds it.
  live: new Set([DuelState.Funded, DuelState.WinnerClaimed, DuelState.MutualCancelRequested]),
  won: new Set([DuelState.Resolved]),
  refunded: new Set([DuelState.Refunded]),
  calledOff: new Set([DuelState.MutuallyCancelled, DuelState.Cancelled, DuelState.Declined]),
  disputed: new Set([DuelState.Disputed]),
};

export function isInFeedFilter(state: DuelState, filter: FeedFilter): boolean {
  const states = STATES_BY_FILTER[filter];
  return states === null || states.has(state);
}

/** A feed's search: the query as `normalizeSearchQuery` folds it, and each duel's search text by id. */
export interface FeedSearch {
  normalizedQuery: string;
  textById: ReadonlyMap<number, string>;
}

function matches(duel: RecentDuel, search: FeedSearch): boolean {
  return !search.normalizedQuery || (search.textById.get(duel.id) ?? '').includes(search.normalizedQuery);
}

/** The duels in a filter's group that match the search, in the order given. */
export function filterFeed<T extends RecentDuel>(duels: readonly T[], filter: FeedFilter, search: FeedSearch): T[] {
  return duels.filter((duel) => isInFeedFilter(duel.state, filter) && matches(duel, search));
}

/** How many duels matching the search each filter would show, so a filter says what it holds. */
export function countFeed(duels: readonly RecentDuel[], search: FeedSearch): Record<FeedFilter, number> {
  const counts = Object.fromEntries(FEED_FILTERS.map((filter) => [filter, 0])) as Record<FeedFilter, number>;
  for (const duel of duels) {
    if (!matches(duel, search)) continue;
    for (const filter of FEED_FILTERS) {
      if (isInFeedFilter(duel.state, filter)) counts[filter] += 1;
    }
  }
  return counts;
}
