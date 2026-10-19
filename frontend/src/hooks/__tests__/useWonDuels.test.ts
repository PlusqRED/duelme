// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecentDuel } from '@/hooks/useRecentDuels';
import { DuelState } from '@/lib/contracts';
import type { DuelMeta } from '@/lib/game';
import { RESULTS_LOOKED_UP, RESULTS_SHOWN } from '@/lib/landingDuels';

const CREATOR = '0x1111111111111111111111111111111111111111';
const OPPONENT = '0x2222222222222222222222222222222222222222';

const chain = vi.hoisted(() => ({
  duels: [] as RecentDuel[],
  metas: {} as Record<number, DuelMeta>,
  askedFor: [] as number[],
}));
vi.mock('@/hooks/useRecentDuels', () => ({
  useRecentDuels: () => ({ duels: chain.duels, isLoading: false, isError: false, retry: vi.fn() }),
}));
vi.mock('@/hooks/usePublicDuelMetas', () => ({
  usePublicDuelMetas: (ids: number[]) => {
    chain.askedFor = ids;
    return { metaByDuelId: chain.metas };
  },
}));
vi.mock('@/hooks/useNicknames', () => ({
  useNicknames: () => ({ resolveDisplay: (address: string) => (address === CREATOR ? 'alice' : 'bob') }),
}));

const { useWonDuels } = await import('@/hooks/useWonDuels');

function duel(id: number, overrides: Partial<RecentDuel> = {}): RecentDuel {
  return {
    id,
    player1: CREATOR,
    player2: OPPONENT,
    wager: 25,
    wagerAmount: 25_000_000n,
    message: 'go 1x1',
    winner: CREATOR,
    lastEventAt: 1_700_000_000n,
    claimTimestamp: 0n,
    chainId: 421614,
    chainName: 'Arbitrum Sepolia',
    state: DuelState.Resolved,
    ...overrides,
  };
}

function meta(duelId: number, gameSlug: string): DuelMeta {
  return {
    duelId,
    chainId: 421614,
    contractAddress: '0x588a54fa8c00c8ac003e41bd8ee26fbc8994105f',
    gameSlug,
    gameName: gameSlug,
    category: 'MOBA',
    creatorAddress: CREATOR,
    createdAt: null,
  };
}

beforeEach(() => {
  chain.duels = [];
  chain.metas = {};
  chain.askedFor = [];
});

afterEach(cleanup);

describe('useWonDuels', () => {
  it('lists a finished duel with both players, the winner’s seat, the stake and its game', () => {
    chain.duels = [duel(3, { winner: OPPONENT })];
    chain.metas = { 3: meta(3, 'dota-2') };

    const { result } = renderHook(() => useWonDuels(null));

    expect(result.current.results).toEqual([
      {
        id: 3,
        creator: CREATOR,
        opponent: OPPONENT,
        creatorName: 'alice',
        opponentName: 'bob',
        winner: 'opponent',
        stake: 25_000_000n,
        note: 'go 1x1',
        endedAt: 1_700_000_000n,
        game: meta(3, 'dota-2'),
      },
    ]);
  });

  it('leaves out duels still played, refunded or disputed', () => {
    chain.duels = [duel(4, { state: DuelState.Funded }), duel(3, { state: DuelState.Refunded }), duel(2, { state: DuelState.Disputed }), duel(1)];

    const { result } = renderHook(() => useWonDuels(null));

    expect(result.current.results.map((each) => each.id)).toEqual([1]);
  });

  it('keeps only the picked game’s duels', () => {
    chain.duels = [duel(3), duel(2), duel(1)];
    chain.metas = { 3: meta(3, 'dota-2'), 2: meta(2, 'chess'), 1: meta(1, 'dota-2') };

    const { result } = renderHook(() => useWonDuels('dota-2'));

    expect(result.current.results.map((each) => each.id)).toEqual([3, 1]);
  });

  it('shows as many as the landing lists', () => {
    chain.duels = Array.from({ length: RESULTS_SHOWN + 3 }, (_, index) => duel(100 - index));

    const { result } = renderHook(() => useWonDuels(null));

    expect(result.current.results).toHaveLength(RESULTS_SHOWN);
  });

  it('looks up the game of the latest finished duels, as many as one batch takes', () => {
    chain.duels = [duel(9999, { state: DuelState.Funded }), ...Array.from({ length: RESULTS_LOOKED_UP + 5 }, (_, index) => duel(5000 - index))];

    renderHook(() => useWonDuels(null));

    expect(chain.askedFor).toHaveLength(RESULTS_LOOKED_UP);
    expect(chain.askedFor[0]).toBe(5000);
  });

  it('tells a quiet arena from a game nobody has finished a duel in yet', () => {
    chain.duels = [duel(1)];
    chain.metas = { 1: meta(1, 'dota-2') };
    const picked = renderHook(() => useWonDuels('chess'));
    chain.duels = [duel(1, { state: DuelState.Funded })];
    const quiet = renderHook(() => useWonDuels(null));

    expect([picked.result.current.results, picked.result.current.hasAny]).toEqual([[], true]);
    expect([quiet.result.current.results, quiet.result.current.hasAny]).toEqual([[], false]);
  });
});
