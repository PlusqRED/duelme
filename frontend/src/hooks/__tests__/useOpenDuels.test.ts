// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicDuel } from '@/lib/publicDuelsFilters';
import type { DuelMeta } from '@/lib/game';
import { OPEN_DUELS_SHOWN } from '@/lib/landingDuels';

const CREATOR = '0x32a3000000000000000000000000000000aa23';

const chain = vi.hoisted(() => ({ duels: [] as PublicDuel[], metas: {} as Record<number, DuelMeta>, askedFor: [] as number[] }));
vi.mock('@/hooks/usePublicDuels', () => ({
  usePublicDuels: () => ({ duels: chain.duels, isLoading: false, isError: false, retry: vi.fn() }),
}));
vi.mock('@/hooks/useDuelMetas', () => ({
  useDuelMetas: (ids: number[]) => {
    chain.askedFor = ids;
    return { metaByDuelId: chain.metas };
  },
}));
vi.mock('@/hooks/useNicknames', () => ({ useNicknames: () => ({ resolveDisplay: () => 'alice' }) }));
vi.mock('@/hooks/useReputationLevels', () => ({
  useReputationLevels: () => ({
    reputationByAddress: { [CREATOR]: 'fair' },
    reputationStatsByAddress: { [CREATOR]: { level: 'fair', honored: 4, total: 4 } },
  }),
}));

const { useOpenDuels } = await import('@/hooks/useOpenDuels');

function duel(id: number): PublicDuel {
  return {
    id,
    creator: CREATOR,
    wagerAmount: 14_000_000n,
    message: 'go 1x1',
    createdAt: 1_700_000_000n,
    chainId: 421614,
  };
}

beforeEach(() => {
  chain.duels = [];
  chain.metas = {};
  chain.askedFor = [];
});

afterEach(cleanup);

describe('useOpenDuels', () => {
  it('shows as many as the landing does and counts every open duel', () => {
    chain.duels = Array.from({ length: OPEN_DUELS_SHOWN + 2 }, (_, index) => duel(index));

    const { result } = renderHook(() => useOpenDuels());

    expect([result.current.duels.length, result.current.total]).toEqual([OPEN_DUELS_SHOWN, OPEN_DUELS_SHOWN + 2]);
  });

  it('looks up the games of the duels it shows only', () => {
    chain.duels = Array.from({ length: OPEN_DUELS_SHOWN + 2 }, (_, index) => duel(index));

    renderHook(() => useOpenDuels());

    expect(chain.askedFor).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('has nothing to show when no duel is open', () => {
    const { result } = renderHook(() => useOpenDuels());

    expect([result.current.duels, result.current.total]).toEqual([[], 0]);
  });
});
