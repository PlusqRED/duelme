// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN, DUELME_ADDRESSES } from '@/lib/constants';
import type { DuelMeta } from '@/lib/game';

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
  isMetaError: false,
  isDuelsError: false,
  refetchMetas: vi.fn(async () => ({})),
  retryDuels: vi.fn(async () => {}),
}));

vi.mock('@/hooks/useDuelsByGame', () => ({
  useDuelsByGame: () => ({ duels: backend.metas, isLoading: false, isError: backend.isMetaError, refetch: backend.refetchMetas }),
}));
vi.mock('@/hooks/useDuelReads', () => ({
  useDuelsByIds: () => ({ duels: [], isLoading: false, isError: backend.isDuelsError, retry: backend.retryDuels }),
}));

const { useGameDuels } = await import('@/hooks/useGameDuels');

beforeEach(() => {
  backend.metas = [CHESS_DUEL];
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
});
