// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN } from '@/lib/constants';

const chain = vi.hoisted(() => ({
  count: { data: 1n as bigint | undefined, isError: false },
  pages: { data: [] as unknown[] | undefined, isError: false },
  refetchCount: vi.fn(async () => ({})),
  refetchPages: vi.fn(async () => ({})),
}));

vi.mock('wagmi', () => ({
  useReadContract: () => ({ ...chain.count, isLoading: false, refetch: chain.refetchCount }),
  useReadContracts: () => ({ ...chain.pages, isLoading: false, refetch: chain.refetchPages }),
}));

const { useDuelRange, useDuelsByIds } = await import('@/hooks/useDuelReads');

beforeEach(() => {
  chain.count = { data: 1n, isError: false };
  chain.pages = { data: [], isError: false };
  chain.refetchCount.mockClear();
  chain.refetchPages.mockClear();
});

afterEach(cleanup);

describe('useDuelRange', () => {
  it('reads the count and every page again, starting over a read already running', async () => {
    const { result } = renderHook(() => useDuelRange({ chainId: DEFAULT_CHAIN.id }));

    await act(() => result.current.refetch());

    expect(chain.refetchCount.mock.calls).toEqual([[]]);
    expect(chain.refetchPages.mock.calls).toEqual([[]]);
  });

  it('tries again by joining a read already running, so a second click does not restart it', async () => {
    const { result } = renderHook(() => useDuelRange({ chainId: DEFAULT_CHAIN.id }));

    await act(() => result.current.retry());

    expect(chain.refetchCount.mock.calls).toEqual([[{ cancelRefetch: false }]]);
    expect(chain.refetchPages.mock.calls).toEqual([[{ cancelRefetch: false }]]);
  });

  it('says the list is short when the count never loaded', () => {
    chain.count = { data: undefined, isError: true };

    const { result } = renderHook(() => useDuelRange({ chainId: DEFAULT_CHAIN.id }));

    expect(result.current.isError).toBe(true);
  });

  it('says the list may be out of date when a later read of it failed', () => {
    chain.count = { data: 1n, isError: true };
    chain.pages = { data: [], isError: true };

    const { result } = renderHook(() => useDuelRange({ chainId: DEFAULT_CHAIN.id }));

    expect(result.current.isError).toBe(true);
  });
});

describe('useDuelsByIds', () => {
  it('tries again by joining a read already running', async () => {
    const { result } = renderHook(() => useDuelsByIds([1, 2], { chainId: DEFAULT_CHAIN.id }));

    await act(() => result.current.retry());

    expect(chain.refetchPages.mock.calls).toEqual([[{ cancelRefetch: false }]]);
  });

  it('says the list is short when no page ever loaded', () => {
    chain.pages = { data: undefined, isError: true };

    const { result } = renderHook(() => useDuelsByIds([1, 2], { chainId: DEFAULT_CHAIN.id }));

    expect(result.current.isError).toBe(true);
  });
});
