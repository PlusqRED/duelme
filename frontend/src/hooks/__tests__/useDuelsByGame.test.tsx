// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN, DUELME_ADDRESSES } from '@/lib/constants';
import type { DuelMeta } from '@/lib/game';

const api = vi.hoisted(() => ({ fetchDuelsByGame: vi.fn() }));
vi.mock('@/lib/gameApi', () => ({ fetchDuelsByGame: api.fetchDuelsByGame }));

const { useDuelsByGame } = await import('@/hooks/useDuelsByGame');

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

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  api.fetchDuelsByGame.mockReset();
});
afterEach(cleanup);

describe('useDuelsByGame', () => {
  it('says the list failed when no read of it ever came back', async () => {
    api.fetchDuelsByGame.mockRejectedValue(new Error('down'));

    const { result } = renderHook(() => useDuelsByGame('chess', DEFAULT_CHAIN.id), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('keeps the list it had when a later read fails', async () => {
    api.fetchDuelsByGame.mockResolvedValueOnce([CHESS_DUEL]).mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useDuelsByGame('chess', DEFAULT_CHAIN.id), { wrapper });
    await waitFor(() => expect(result.current.duels).toHaveLength(1));

    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(client.getQueryState(['duelsByGame', 'chess', DEFAULT_CHAIN.id])?.status).toBe('error'));

    expect([result.current.duels.length, result.current.isError]).toEqual([1, false]);
  });
});
