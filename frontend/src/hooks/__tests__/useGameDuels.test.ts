// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN, DUELME_ADDRESSES } from '@/lib/constants';
import { DuelState } from '@/lib/contracts';
import type { DuelRecord } from '@/lib/duel';
import type { DuelMeta } from '@/lib/game';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const CHESS_DUEL: DuelMeta = {
  duelId: 3,
  chainId: DEFAULT_CHAIN.id,
  contractAddress: DUELME_ADDRESSES[DEFAULT_CHAIN.id],
  gameSlug: 'chess',
  gameName: 'Chess',
  category: 'STRATEGY',
  creatorAddress: '0x32a3000000000000000000000000000000aa23',
  createdAt: null,
};

const backend = vi.hoisted(() => ({
  metas: [] as DuelMeta[],
  records: [] as DuelRecord[],
  isMetaError: false,
  isDuelsError: false,
  refetchMetas: vi.fn(async () => ({})),
  retryDuels: vi.fn(async () => {}),
}));

vi.mock('@/hooks/useDuelsByGame', () => ({
  useDuelsByGame: () => ({ duels: backend.metas, isLoading: false, isError: backend.isMetaError, refetch: backend.refetchMetas }),
}));
vi.mock('@/hooks/useDuelReads', () => ({
  useDuelsByIds: () => ({ duels: backend.records, isLoading: false, isError: backend.isDuelsError, retry: backend.retryDuels }),
}));

const { useGameDuels } = await import('@/hooks/useGameDuels');

beforeEach(() => {
  backend.metas = [CHESS_DUEL];
  backend.records = [];
  backend.isMetaError = false;
  backend.isDuelsError = false;
  backend.refetchMetas.mockClear();
  backend.retryDuels.mockClear();
});

afterEach(cleanup);

describe('useGameDuels', () => {
  it('says the list is short when the game’s duels could not be listed', () => {
    backend.metas = [];
    backend.isMetaError = true;

    const { result } = renderHook(() => useGameDuels('chess', DEFAULT_CHAIN.id));

    expect([result.current.isError, result.current.duelsPlayed]).toEqual([true, 0]);
  });

  it('says the list is short when the duels themselves could not be read', () => {
    backend.isDuelsError = true;

    const { result } = renderHook(() => useGameDuels('chess', DEFAULT_CHAIN.id));

    expect(result.current.isError).toBe(true);
  });

  it('tries the listing and the duels again, joining reads already running', async () => {
    const { result } = renderHook(() => useGameDuels('chess', DEFAULT_CHAIN.id));

    await act(() => result.current.retry());

    expect(backend.refetchMetas.mock.calls).toEqual([[{ cancelRefetch: false }]]);
    expect(backend.retryDuels).toHaveBeenCalledOnce();
  });

  it('keeps the records of the game’s own duels only, matched by id', () => {
    backend.records = [{ ...duelView(), id: 3 }, { ...duelView(), id: 9 }];

    const { result } = renderHook(() => useGameDuels('chess', DEFAULT_CHAIN.id));

    expect(result.current.duels.map((duel) => duel.id)).toEqual([3]);
  });

  it('counts both stakes of every duel someone joined, and those duels', () => {
    backend.metas = [CHESS_DUEL, { ...CHESS_DUEL, duelId: 4 }, { ...CHESS_DUEL, duelId: 5 }];
    backend.records = [
      { ...duelView({ state: DuelState.Resolved, fundedAt: 2n, wagerAmount: 5_000_000n }), id: 3 },
      { ...duelView({ state: DuelState.Funded, fundedAt: 2n, wagerAmount: 1_000_000n }), id: 4 },
      { ...duelView({ wagerAmount: 50_000_000n }), id: 5 },
    ];

    const { result } = renderHook(() => useGameDuels('chess', DEFAULT_CHAIN.id));

    expect([result.current.totalVolume, result.current.duelsPlayed]).toEqual([12_000_000n, 2]);
  });

  it('gives each duel its metadata by id', () => {
    const { result } = renderHook(() => useGameDuels('chess', DEFAULT_CHAIN.id));

    expect(result.current.metaByDuelId).toEqual({ 3: CHESS_DUEL });
  });
});
