// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecentDuel } from '@/lib/duelFeed';
import { duelMeta } from '@/lib/__tests__/helpers/duelMeta';
import { DuelState } from '@/lib/contracts';
import type { DuelMeta } from '@/lib/game';
import { RESULTS_SHOWN } from '@/lib/landingDuels';

const CREATOR = '0x1111111111111111111111111111111111111111';
const OPPONENT = '0x2222222222222222222222222222222222222222';

const backend = vi.hoisted(() => ({
  duels: [] as RecentDuel[],
  metas: {} as Record<number, DuelMeta>,
  byGame: {} as Record<string, DuelMeta[]>,
  loadingGames: [] as string[],
  failedGames: [] as string[],
  refetched: [] as string[],
  askedIds: [] as number[],
  askedGames: [] as (string | undefined)[],
}));
vi.mock('@/hooks/useRecentDuels', () => ({
  useRecentDuels: () => ({
    duels: backend.duels,
    isLoading: false,
    isError: false,
    retry: async () => {
      backend.refetched.push('recent');
    },
  }),
}));
vi.mock('@/hooks/useDuelMetas', () => ({
  useDuelMetas: (ids: number[]) => {
    backend.askedIds = ids;
    return { metaByDuelId: Object.fromEntries(ids.flatMap((id) => (backend.metas[id] ? [[id, backend.metas[id]]] : []))) };
  },
}));
vi.mock('@/hooks/useDuelsByGame', () => ({
  useDuelsByGame: (slug: string | undefined) => {
    backend.askedGames.push(slug);
    const isLoading = slug !== undefined && backend.loadingGames.includes(slug);
    const isError = slug !== undefined && backend.failedGames.includes(slug);
    return {
      duels: slug && !isLoading && !isError ? (backend.byGame[slug] ?? []) : [],
      isLoading,
      isError,
      // A retry joins a read already running; one that started it over would show as restarted.
      refetch: async (options?: { cancelRefetch?: boolean }) => {
        backend.refetched.push(`${slug ?? 'no game'}${options?.cancelRefetch === false ? '' : ' (restarted)'}`);
      },
    };
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
    wagerAmount: 25_000_000n,
    message: 'go 1x1',
    winner: CREATOR,
    lastEventAt: 1_700_000_000n,
    claimTimestamp: 0n,
    state: DuelState.Resolved,
    creatorPayout: 50_000_000n,
    opponentPayout: 0n,
    creatorClaimed: true,
    opponentClaimed: false,
    ...overrides,
  };
}

beforeEach(() => {
  Object.assign(backend, {
    duels: [],
    metas: {},
    byGame: {},
    loadingGames: [],
    failedGames: [],
    refetched: [],
    askedIds: [],
    askedGames: [],
  });
});

afterEach(cleanup);

describe('useWonDuels', () => {
  it('lists a finished duel with both players named and its game', () => {
    backend.duels = [duel(3, { winner: OPPONENT })];
    backend.metas = { 3: duelMeta(3, 'dota-2') };

    const { result } = renderHook(() => useWonDuels(null));

    expect(result.current.results).toEqual([
      { ...duel(3, { winner: OPPONENT }), creatorName: 'alice', opponentName: 'bob', game: duelMeta(3, 'dota-2') },
    ]);
  });

  it('leaves out duels still played, refunded or disputed', () => {
    backend.duels = [duel(4, { state: DuelState.Funded }), duel(3, { state: DuelState.Refunded }), duel(2, { state: DuelState.Disputed }), duel(1)];

    const { result } = renderHook(() => useWonDuels(null));

    expect(result.current.results.map((each) => each.id)).toEqual([1]);
  });

  it('shows as many as the landing lists, and looks up the game of those only', () => {
    backend.duels = Array.from({ length: RESULTS_SHOWN + 3 }, (_, index) => duel(100 - index));

    const { result } = renderHook(() => useWonDuels(null));

    expect(result.current.results).toHaveLength(RESULTS_SHOWN);
    expect(backend.askedIds).toEqual([100, 99, 98, 97, 96, 95]);
  });

  it('finds the picked game’s duels among that game’s own, with their metadata', () => {
    backend.duels = [duel(3), duel(2), duel(1)];
    backend.byGame = { 'dota-2': [duelMeta(1, 'dota-2'), duelMeta(3, 'dota-2'), duelMeta(7, 'dota-2')] };

    const { result } = renderHook(() => useWonDuels('dota-2'));

    expect(result.current.results.map((each) => [each.id, each.game?.gameSlug])).toEqual([
      [3, 'dota-2'],
      [1, 'dota-2'],
    ]);
    expect(backend.askedIds).toEqual([]);
  });

  it('starts loading a game just picked while the list still holds the last one', () => {
    renderHook(() => useWonDuels(null, 'chess'));

    expect(backend.askedGames).toContain('chess');
  });

  it('is loading while the held game’s duels are on their way', () => {
    backend.duels = [duel(1)];
    backend.loadingGames = ['chess'];

    const { result } = renderHook(() => useWonDuels('chess'));

    expect([result.current.isLoading, result.current.results]).toEqual([true, []]);
  });

  it('says the list is short when the held game’s duels could not be read', () => {
    backend.duels = [duel(1)];
    backend.failedGames = ['chess'];

    const { result } = renderHook(() => useWonDuels('chess'));

    expect(result.current.isError).toBe(true);
  });

  it('reads the held game’s duels again with the arena’s, joining reads already running', async () => {
    const { result } = renderHook(() => useWonDuels('chess'));

    await act(() => result.current.retry());

    expect(backend.refetched).toEqual(['recent', 'chess']);
  });

  it('reads only the arena again when no game is held', async () => {
    const { result } = renderHook(() => useWonDuels(null));

    await act(() => result.current.retry());

    expect(backend.refetched).toEqual(['recent']);
  });

  it('tells a quiet arena from a game nobody has finished a duel in yet', () => {
    backend.duels = [duel(1)];
    const picked = renderHook(() => useWonDuels('chess'));
    backend.duels = [duel(1, { state: DuelState.Funded })];
    const quiet = renderHook(() => useWonDuels(null));

    expect([picked.result.current.results, picked.result.current.hasAny]).toEqual([[], true]);
    expect([quiet.result.current.results, quiet.result.current.hasAny]).toEqual([[], false]);
  });
});
