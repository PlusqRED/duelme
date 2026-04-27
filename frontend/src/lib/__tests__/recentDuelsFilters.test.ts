import { describe, it, expect } from 'vitest';
import type { RecentDuel } from '@/hooks/useRecentDuels';
import { ZERO_ADDRESS } from '@/lib/constants';
import { DuelState } from '@/lib/contracts';
import {
  applyRecentFilters,
  RECENT_STATE_FILTERS,
  RECENT_SORT_OPTIONS,
} from '../recentDuelsFilters';

function makeDuel(overrides: Partial<RecentDuel> = {}): RecentDuel {
  return {
    id: 0,
    player1: '0x1111111111111111111111111111111111111111' as const,
    player2: '0x2222222222222222222222222222222222222222' as const,
    wager: 10,
    message: '',
    winner: ZERO_ADDRESS,
    lastEventAt: 1_700_000_000n,
    claimTimestamp: 0n,
    chainId: 421614,
    chainName: 'Arb Sepolia',
    state: DuelState.Resolved,
    ...overrides,
  };
}

const SEARCH_INDEX_BY_ID: Record<number, string> = {};

function searchIndex(duel: RecentDuel) {
  return SEARCH_INDEX_BY_ID[duel.id] ?? '';
}

describe('RECENT_STATE_FILTERS / RECENT_SORT_OPTIONS', () => {
  it('exposes the six expected state filters in display order', () => {
    expect(RECENT_STATE_FILTERS).toEqual([
      'all',
      'live',
      'resolved',
      'refunded',
      'cancelled',
      'disputed',
    ]);
  });

  it('exposes the four expected sort options', () => {
    expect(RECENT_SORT_OPTIONS).toEqual([
      'newest',
      'oldest',
      'highestWager',
      'lowestWager',
    ]);
  });
});

describe('applyRecentFilters - state filtering', () => {
  const duels: RecentDuel[] = [
    makeDuel({ id: 1, state: DuelState.Funded }),
    makeDuel({ id: 2, state: DuelState.WinnerClaimed }),
    makeDuel({ id: 3, state: DuelState.MutualCancelRequested }),
    makeDuel({ id: 4, state: DuelState.Resolved }),
    makeDuel({ id: 5, state: DuelState.Refunded }),
    makeDuel({ id: 6, state: DuelState.Cancelled }),
    makeDuel({ id: 7, state: DuelState.Declined }),
    makeDuel({ id: 8, state: DuelState.MutuallyCancelled }),
    makeDuel({ id: 9, state: DuelState.Disputed }),
  ];

  it('all returns every duel', () => {
    const result = applyRecentFilters(duels, {
      stateFilter: 'all',
      sort: 'newest',
      searchQuery: '',
      buildSearchIndex: searchIndex,
    });
    expect(result).toHaveLength(9);
  });

  it('live returns Funded + WinnerClaimed + MutualCancelRequested', () => {
    const result = applyRecentFilters(duels, {
      stateFilter: 'live',
      sort: 'newest',
      searchQuery: '',
      buildSearchIndex: searchIndex,
    });
    expect(result.map((d) => d.id).sort()).toEqual([1, 2, 3]);
  });

  it('resolved returns only Resolved', () => {
    const result = applyRecentFilters(duels, {
      stateFilter: 'resolved',
      sort: 'newest',
      searchQuery: '',
      buildSearchIndex: searchIndex,
    });
    expect(result.map((d) => d.id)).toEqual([4]);
  });

  it('refunded returns only Refunded', () => {
    const result = applyRecentFilters(duels, {
      stateFilter: 'refunded',
      sort: 'newest',
      searchQuery: '',
      buildSearchIndex: searchIndex,
    });
    expect(result.map((d) => d.id)).toEqual([5]);
  });

  it('cancelled groups Cancelled + Declined + MutuallyCancelled', () => {
    const result = applyRecentFilters(duels, {
      stateFilter: 'cancelled',
      sort: 'newest',
      searchQuery: '',
      buildSearchIndex: searchIndex,
    });
    expect(result.map((d) => d.id).sort()).toEqual([6, 7, 8]);
  });

  it('disputed returns only Disputed', () => {
    const result = applyRecentFilters(duels, {
      stateFilter: 'disputed',
      sort: 'newest',
      searchQuery: '',
      buildSearchIndex: searchIndex,
    });
    expect(result.map((d) => d.id)).toEqual([9]);
  });
});

describe('applyRecentFilters - search', () => {
  const duels: RecentDuel[] = [
    makeDuel({ id: 1 }),
    makeDuel({ id: 2 }),
    makeDuel({ id: 3 }),
  ];

  it('returns all duels when search query is empty', () => {
    const result = applyRecentFilters(duels, {
      stateFilter: 'all',
      sort: 'newest',
      searchQuery: '',
      buildSearchIndex: () => 'whatever',
    });
    expect(result).toHaveLength(3);
  });

  it('filters duels by buildSearchIndex substring match', () => {
    const indexes: Record<number, string> = {
      1: 'alice resolved 5 usdt',
      2: 'bob refunded 10 usdt',
      3: 'charlie disputed 3 usdt',
    };
    const result = applyRecentFilters(duels, {
      stateFilter: 'all',
      sort: 'newest',
      searchQuery: 'bob',
      buildSearchIndex: (d) => indexes[d.id],
    });
    expect(result.map((d) => d.id)).toEqual([2]);
  });

  it('search query is normalized (case-insensitive, trimmed)', () => {
    const indexes: Record<number, string> = {
      1: 'alice',
      2: 'bob',
      3: 'charlie',
    };
    const result = applyRecentFilters(duels, {
      stateFilter: 'all',
      sort: 'newest',
      searchQuery: '  ALICE  ',
      buildSearchIndex: (d) => indexes[d.id],
    });
    expect(result.map((d) => d.id)).toEqual([1]);
  });
});

describe('applyRecentFilters - sorting', () => {
  const duels: RecentDuel[] = [
    makeDuel({ id: 1, wager: 5, lastEventAt: 1_700_000_001n }),
    makeDuel({ id: 2, wager: 50, lastEventAt: 1_700_000_002n }),
    makeDuel({ id: 3, wager: 10, lastEventAt: 1_700_000_003n }),
  ];

  it('newest sorts by lastEventAt descending', () => {
    const result = applyRecentFilters(duels, {
      stateFilter: 'all',
      sort: 'newest',
      searchQuery: '',
      buildSearchIndex: searchIndex,
    });
    expect(result.map((d) => d.id)).toEqual([3, 2, 1]);
  });

  it('oldest sorts by lastEventAt ascending', () => {
    const result = applyRecentFilters(duels, {
      stateFilter: 'all',
      sort: 'oldest',
      searchQuery: '',
      buildSearchIndex: searchIndex,
    });
    expect(result.map((d) => d.id)).toEqual([1, 2, 3]);
  });

  it('highestWager sorts by wager descending, lastEventAt as tiebreaker', () => {
    const result = applyRecentFilters(duels, {
      stateFilter: 'all',
      sort: 'highestWager',
      searchQuery: '',
      buildSearchIndex: searchIndex,
    });
    expect(result.map((d) => d.id)).toEqual([2, 3, 1]);
  });

  it('lowestWager sorts by wager ascending, lastEventAt as tiebreaker', () => {
    const result = applyRecentFilters(duels, {
      stateFilter: 'all',
      sort: 'lowestWager',
      searchQuery: '',
      buildSearchIndex: searchIndex,
    });
    expect(result.map((d) => d.id)).toEqual([1, 3, 2]);
  });

  it('breaks wager ties using lastEventAt descending', () => {
    const sameWager: RecentDuel[] = [
      makeDuel({ id: 1, wager: 10, lastEventAt: 1_700_000_001n }),
      makeDuel({ id: 2, wager: 10, lastEventAt: 1_700_000_005n }),
      makeDuel({ id: 3, wager: 10, lastEventAt: 1_700_000_003n }),
    ];
    const result = applyRecentFilters(sameWager, {
      stateFilter: 'all',
      sort: 'highestWager',
      searchQuery: '',
      buildSearchIndex: searchIndex,
    });
    expect(result.map((d) => d.id)).toEqual([2, 3, 1]);
  });
});

describe('applyRecentFilters - composition', () => {
  it('applies state filter, search, and sort together', () => {
    const duels: RecentDuel[] = [
      makeDuel({ id: 1, state: DuelState.Resolved, wager: 5, lastEventAt: 100n }),
      makeDuel({ id: 2, state: DuelState.Refunded, wager: 50, lastEventAt: 200n }),
      makeDuel({ id: 3, state: DuelState.Resolved, wager: 25, lastEventAt: 300n }),
      makeDuel({ id: 4, state: DuelState.Cancelled, wager: 100, lastEventAt: 400n }),
    ];
    const indexes: Record<number, string> = {
      1: 'alice cs2 resolved',
      2: 'bob valorant refunded',
      3: 'alice valorant resolved',
      4: 'charlie dota cancelled',
    };
    const result = applyRecentFilters(duels, {
      stateFilter: 'resolved',
      sort: 'highestWager',
      searchQuery: 'alice',
      buildSearchIndex: (d) => indexes[d.id],
    });
    // 'alice' matches 1 and 3, 'resolved' state keeps both, sort by wager desc
    expect(result.map((d) => d.id)).toEqual([3, 1]);
  });

  it('returns empty when filters yield no matches', () => {
    const duels: RecentDuel[] = [makeDuel({ id: 1, state: DuelState.Resolved })];
    const result = applyRecentFilters(duels, {
      stateFilter: 'disputed',
      sort: 'newest',
      searchQuery: '',
      buildSearchIndex: searchIndex,
    });
    expect(result).toEqual([]);
  });

  it('handles empty input array', () => {
    const result = applyRecentFilters([], {
      stateFilter: 'all',
      sort: 'newest',
      searchQuery: 'anything',
      buildSearchIndex: searchIndex,
    });
    expect(result).toEqual([]);
  });
});
