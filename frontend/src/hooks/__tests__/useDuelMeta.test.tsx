// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN, DUELME_ADDRESSES } from '@/lib/constants';
import type { DuelMeta } from '@/lib/game';

const api = vi.hoisted(() => ({ fetchDuelMeta: vi.fn() }));
vi.mock('@/lib/gameApi', () => ({ fetchDuelMeta: api.fetchDuelMeta }));

const { useDuelMeta } = await import('@/hooks/useDuelMeta');

const CHAIN_ID = DEFAULT_CHAIN.id;
const CONTRACT = DUELME_ADDRESSES[CHAIN_ID];
const CHESS: DuelMeta = {
  duelId: 3,
  chainId: CHAIN_ID,
  contractAddress: CONTRACT,
  gameSlug: 'chess',
  gameName: 'Chess',
  category: 'STRATEGY',
  creatorAddress: '0x32a3000000000000000000000000000000aa23',
  createdAt: null,
};

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  api.fetchDuelMeta.mockResolvedValue(CHESS);
});

afterEach(() => {
  cleanup();
  client.clear();
  api.fetchDuelMeta.mockReset();
});

describe('useDuelMeta', () => {
  it('reads the game of the duel in this chain’s contract', async () => {
    const { result } = renderHook(() => useDuelMeta(3, CHAIN_ID), { wrapper });

    await waitFor(() => expect(result.current.meta).toEqual(CHESS));
    expect(api.fetchDuelMeta).toHaveBeenCalledWith(3, CHAIN_ID, CONTRACT);
  });

  it('keys the read by the contract, since duel ids restart on a redeploy', async () => {
    renderHook(() => useDuelMeta(3, CHAIN_ID), { wrapper });

    await waitFor(() => expect(api.fetchDuelMeta).toHaveBeenCalled());
    expect(client.getQueryCache().getAll().map((query) => query.queryKey)).toEqual([
      ['duelMeta', CHAIN_ID, CONTRACT.toLowerCase(), 3],
    ]);
  });

  it('reads nothing on a chain without a contract', () => {
    const { result } = renderHook(() => useDuelMeta(3, 1), { wrapper });

    expect(result.current.meta).toBeNull();
    expect(api.fetchDuelMeta).not.toHaveBeenCalled();
  });
});
