import { DuelState } from '@/lib/contracts';
import { normalizeSearchQuery } from '@/lib/duelSearch';
import type { RecentDuel } from '@/hooks/useRecentDuels';
import type { Language } from '@/i18n/translations';

export type RecentStateFilter =
  | 'all'
  | 'live'
  | 'resolved'
  | 'refunded'
  | 'cancelled'
  | 'disputed';

export type RecentSortBy = 'newest' | 'oldest' | 'highestWager' | 'lowestWager';

export const RECENT_STATE_FILTERS: readonly RecentStateFilter[] = [
  'all',
  'live',
  'resolved',
  'refunded',
  'cancelled',
  'disputed',
] as const;

export const RECENT_SORT_OPTIONS: readonly RecentSortBy[] = [
  'newest',
  'oldest',
  'highestWager',
  'lowestWager',
] as const;

const STATES_BY_FILTER: Record<RecentStateFilter, ReadonlySet<DuelState> | null> = {
  all: null,
  live: new Set([
    DuelState.Funded,
    DuelState.WinnerClaimed,
    DuelState.MutualCancelRequested,
  ]),
  resolved: new Set([DuelState.Resolved]),
  refunded: new Set([DuelState.Refunded]),
  cancelled: new Set([
    DuelState.Cancelled,
    DuelState.Declined,
    DuelState.MutuallyCancelled,
  ]),
  disputed: new Set([DuelState.Disputed]),
};

export function isStateInFilter(state: DuelState, filter: RecentStateFilter): boolean {
  const set = STATES_BY_FILTER[filter];
  return set === null || set.has(state);
}

export interface ApplyRecentFiltersOptions {
  stateFilter: RecentStateFilter;
  sort: RecentSortBy;
  searchQuery: string;
  /** The language the search text was built in: the query is folded the way it was. */
  language: Language;
  buildSearchIndex: (duel: RecentDuel) => string;
}

export function applyRecentFilters(
  duels: RecentDuel[],
  { stateFilter, sort, searchQuery, language, buildSearchIndex }: ApplyRecentFiltersOptions
): RecentDuel[] {
  const normalizedQuery = normalizeSearchQuery(searchQuery, language);

  const filtered = duels.filter((duel) => {
    if (!isStateInFilter(duel.state, stateFilter)) return false;
    if (!normalizedQuery) return true;
    return buildSearchIndex(duel).includes(normalizedQuery);
  });

  return filtered.sort((a, b) => compareDuels(a, b, sort));
}

function compareDuels(a: RecentDuel, b: RecentDuel, sort: RecentSortBy): number {
  switch (sort) {
    case 'newest':
      return compareTimestampDesc(a, b);
    case 'oldest':
      return compareTimestampAsc(a, b);
    case 'highestWager':
      if (a.wager !== b.wager) return b.wager - a.wager;
      return compareTimestampDesc(a, b);
    case 'lowestWager':
      if (a.wager !== b.wager) return a.wager - b.wager;
      return compareTimestampDesc(a, b);
  }
}

function compareTimestampDesc(a: RecentDuel, b: RecentDuel): number {
  if (a.lastEventAt === b.lastEventAt) return b.id - a.id;
  return a.lastEventAt > b.lastEventAt ? -1 : 1;
}

function compareTimestampAsc(a: RecentDuel, b: RecentDuel): number {
  if (a.lastEventAt === b.lastEventAt) return a.id - b.id;
  return a.lastEventAt < b.lastEventAt ? -1 : 1;
}
