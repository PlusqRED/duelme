// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN, DUELME_ADDRESSES } from '@/lib/constants';
import type { DuelMeta } from '@/lib/game';

const api = vi.hoisted(() => ({ fetchDuelMetaBatch: vi.fn() }));
vi.mock('@/lib/gameApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/gameApi')>()),
  fetchDuelMetaBatch: api.fetchDuelMetaBatch,
}));

const { useDuelMetas } = await import('@/hooks/useDuelMetas');

const CHAIN_ID = DEFAULT_CHAIN.id;
const CONTRACT = DUELME_ADDRESSES[CHAIN_ID];

function meta(duelId: number): DuelMeta {
  return {
    duelId,
    chainId: CHAIN_ID,
    contractAddress: CONTRACT,
    gameSlug: 'chess',
    gameName: 'Chess',
    category: 'STRATEGY',
    creatorAddress: '0x32a3000000000000000000000000000000aa23',
    createdAt: null,
  };
}

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  api.fetchDuelMetaBatch.mockImplementation((_chainId: number, _contract: string, ids: number[]) => Promise.resolve(ids.map(meta)));
});

afterEach(() => {
  cleanup();
  client.clear();
  api.fetchDuelMetaBatch.mockReset();
});

describe('useDuelMetas', () => {
  it('reads the games of the duels in this chain’s contract', async () => {
    const { result } = renderHook(() => useDuelMetas([4, 2], CHAIN_ID), { wrapper });

    await waitFor(() => expect(Object.keys(result.current.metaByDuelId)).toEqual(['2', '4']));
    expect(api.fetchDuelMetaBatch).toHaveBeenCalledWith(CHAIN_ID, CONTRACT, [2, 4]);
  });

  it('asks for a long history in batches the backend accepts', async () => {
    const ids = Array.from({ length: 450 }, (_, index) => index);

    const { result } = renderHook(() => useDuelMetas(ids, CHAIN_ID), { wrapper });

    await waitFor(() => expect(Object.keys(result.current.metaByDuelId)).toHaveLength(450));
    expect(api.fetchDuelMetaBatch.mock.calls.map((call) => (call[2] as number[]).length)).toEqual([200, 200, 50]);
  });

  it('keeps the batches that answered when one fails', async () => {
    api.fetchDuelMetaBatch.mockImplementation((_chainId: number, _contract: string, ids: number[]) =>
      ids[0] === 0 ? Promise.reject(new Error('down')) : Promise.resolve(ids.map(meta))
    );
    const ids = Array.from({ length: 201 }, (_, index) => index);

    const { result } = renderHook(() => useDuelMetas(ids, CHAIN_ID), { wrapper });

    await waitFor(() => expect(Object.keys(result.current.metaByDuelId)).toEqual(['200']));
  });

  it('asks for nothing without duels', () => {
    const { result } = renderHook(() => useDuelMetas([], CHAIN_ID), { wrapper });

    expect(result.current.metaByDuelId).toEqual({});
    expect(api.fetchDuelMetaBatch).not.toHaveBeenCalled();
  });
});
