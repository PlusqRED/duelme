// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '@/hooks/useGame';
import type { Game } from '@/lib/game';
import { mockFetch } from '@/lib/__tests__/helpers/mockFetch';

const CHESS: Game = { slug: 'chess', name: 'Chess', iconUrl: null, category: 'STRATEGY', duelCount: 2, createdAt: null, updatedAt: null };

function withQueries({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useGame', () => {
  it('uses the game the page server read, with no second read', () => {
    const fetchMock = mockFetch();

    const { result } = renderHook(() => useGame('chess', CHESS), { wrapper: withQueries });

    expect([result.current.game, result.current.isLoading]).toEqual([CHESS, false]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads the game itself without one', async () => {
    mockFetch({ json: async () => CHESS });

    const { result } = renderHook(() => useGame('chess'), { wrapper: withQueries });

    await waitFor(() => expect(result.current.game).toEqual(CHESS));
  });

  it('calls a game the catalog lacks null, and not an error', async () => {
    mockFetch({ ok: false, status: 404 });

    const { result } = renderHook(() => useGame('zork'), { wrapper: withQueries });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect([result.current.game, result.current.isError]).toEqual([null, false]);
  });
});
