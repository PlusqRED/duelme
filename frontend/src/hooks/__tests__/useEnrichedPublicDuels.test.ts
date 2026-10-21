// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicDuel } from '@/lib/publicDuelsFilters';
import type { DuelMeta } from '@/lib/game';

const CREATOR = '0x32a3000000000000000000000000000000aa23';

const chain = vi.hoisted(() => ({ duels: [] as PublicDuel[], metas: {} as Record<number, DuelMeta>, askedFor: [] as number[] }));
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

const { useEnrichedPublicDuels } = await import('@/hooks/useEnrichedPublicDuels');

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

describe('useEnrichedPublicDuels', () => {
  it('gives each open duel its game, its creator’s name and their record', () => {
    chain.duels = [duel(7)];
    chain.metas = {
      7: {
        duelId: 7,
        chainId: 421614,
        contractAddress: '0x588a54fa8c00c8ac003e41bd8ee26fbc8994105f',
        gameSlug: 'wow-midnight',
        gameName: 'Wow Midnight',
        category: 'OTHER',
        creatorAddress: CREATOR,
        createdAt: null,
      },
    };

    const { result } = renderHook(() => useEnrichedPublicDuels(chain.duels));

    expect(result.current[0]).toMatchObject({
      id: 7,
      wagerAmount: 14_000_000n,
      gameName: 'Wow Midnight',
      gameCategory: 'OTHER',
      creatorName: 'alice',
      reputationStats: { level: 'fair', honored: 4, total: 4 },
    });
  });

  it('looks up the games of the duels given', () => {
    chain.duels = [duel(4), duel(9)];

    renderHook(() => useEnrichedPublicDuels(chain.duels));

    expect(chain.askedFor).toEqual([4, 9]);
  });

  it('leaves a duel whose game is not known without one', () => {
    chain.duels = [duel(4)];

    const { result } = renderHook(() => useEnrichedPublicDuels(chain.duels));

    expect([result.current[0].gameName, result.current[0].gameCategory]).toEqual([null, null]);
  });
});
