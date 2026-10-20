import { describe, expect, it } from 'vitest';
import { DuelState } from '@/lib/contracts';
import {
  byLatestEvent,
  countFeed,
  feedMoney,
  filterFeed,
  isInFeedFilter,
  recentDuelsOf,
  toFeedDuel,
  toRecentDuel,
  type RecentDuel,
} from '@/lib/duelFeed';
import { duelMeta } from '@/lib/__tests__/helpers/duelMeta';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const OPPONENT = '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb';

function joined(id: number, overrides: Parameters<typeof duelView>[0] = {}) {
  return { ...duelView({ opponent: OPPONENT, state: DuelState.Funded, fundedAt: 10n, ...overrides }), id };
}

function recent(id: number, state: DuelState, lastEventAt = 10n): RecentDuel {
  return toRecentDuel(joined(id, { state, fundedAt: lastEventAt })) as RecentDuel;
}

const NO_SEARCH = { normalizedQuery: '', textById: new Map<number, string>() };

describe('toRecentDuel', () => {
  it('leaves out a duel nobody joined', () => {
    expect(toRecentDuel({ ...duelView(), id: 1 })).toBeNull();
  });

  it('dates a joined duel by its latest event', () => {
    expect(toRecentDuel(joined(1, { claimTimestamp: 20n }))?.lastEventAt).toBe(20n);
  });

  it('seats the creator first and the opponent second', () => {
    const duel = toRecentDuel(joined(1));

    expect([duel?.player1, duel?.player2]).toEqual(['0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa', OPPONENT]);
  });
});

describe('toFeedDuel', () => {
  it('names both players and carries the game', () => {
    const duel = toFeedDuel(recent(1, DuelState.Funded), (address) => (address === OPPONENT ? 'bob' : 'alice'), duelMeta(1, 'chess'));

    expect([duel.creatorName, duel.opponentName, duel.game?.gameSlug]).toEqual(['alice', 'bob', 'chess']);
  });
});

describe('byLatestEvent', () => {
  it('puts the duel that moved last first', () => {
    expect([recent(1, DuelState.Funded, 5n), recent(2, DuelState.Funded, 9n)].sort(byLatestEvent).map((duel) => duel.id)).toEqual([2, 1]);
  });

  it('puts the later duel first when both moved in the same second', () => {
    expect([recent(1, DuelState.Funded, 5n), recent(2, DuelState.Funded, 5n)].sort(byLatestEvent).map((duel) => duel.id)).toEqual([2, 1]);
  });
});

describe('recentDuelsOf', () => {
  it('keeps the joined duels only, newest event first', () => {
    const records = [joined(1, { fundedAt: 5n }), { ...duelView(), id: 2 }, joined(3, { fundedAt: 9n })];

    expect(recentDuelsOf(records).map((duel) => duel.id)).toEqual([3, 1]);
  });
});

describe('feedMoney', () => {
  it('pays a resolved duel to the winner', () => {
    expect(feedMoney('resolved')).toBe('won');
  });

  it('sends the stakes back from a reported win whose time ran out', () => {
    expect(feedMoney('timeout')).toBe('back');
  });

  it('sends the stakes back from a disputed duel', () => {
    expect(feedMoney('disputed')).toBe('back');
  });

  it('keeps the stakes in the contract while the duel is played', () => {
    expect(feedMoney('claimed')).toBe('held');
  });
});

describe('isInFeedFilter', () => {
  it('counts a reported win among the duels in play', () => {
    expect(isInFeedFilter(DuelState.WinnerClaimed, 'live')).toBe(true);
  });

  it('counts a declined duel among those called off', () => {
    expect(isInFeedFilter(DuelState.Declined, 'calledOff')).toBe(true);
  });

  it('keeps a refunded duel out of the won ones', () => {
    expect(isInFeedFilter(DuelState.Refunded, 'won')).toBe(false);
  });
});

describe('filterFeed', () => {
  const duels = [recent(1, DuelState.Resolved), recent(2, DuelState.Funded), recent(3, DuelState.Resolved)];

  it('keeps the duels in the filter’s group', () => {
    expect(filterFeed(duels, 'won', NO_SEARCH).map((duel) => duel.id)).toEqual([1, 3]);
  });

  it('keeps the duels whose text holds the search', () => {
    const search = { normalizedQuery: 'chess', textById: new Map([[1, '#1 chess'], [3, '#3 dota']]) };

    expect(filterFeed(duels, 'all', search).map((duel) => duel.id)).toEqual([1]);
  });
});

describe('countFeed', () => {
  it('counts what each filter would show of the duels that match the search', () => {
    const duels = [recent(1, DuelState.Resolved), recent(2, DuelState.Funded), recent(3, DuelState.Disputed)];
    const search = { normalizedQuery: 'x', textById: new Map([[1, 'x'], [2, 'x'], [3, 'y']]) };

    expect(countFeed(duels, search)).toEqual({ all: 2, live: 1, won: 1, refunded: 0, calledOff: 0, disputed: 0 });
  });
});
