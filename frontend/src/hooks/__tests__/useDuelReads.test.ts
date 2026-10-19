// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN } from '@/lib/constants';

const chain = vi.hoisted(() => ({
  refetchCount: vi.fn(async () => ({})),
  refetchPages: vi.fn(async () => ({})),
}));

vi.mock('wagmi', () => ({
  useReadContract: () => ({ data: 1n, isLoading: false, isError: false, refetch: chain.refetchCount }),
  useReadContracts: () => ({ data: [], isLoading: false, isError: false, refetch: chain.refetchPages }),
}));

const { useDuelRange, useDuelsByIds } = await import('@/hooks/useDuelReads');

beforeEach(() => {
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
});

describe('useDuelsByIds', () => {
  it('reads every page again, starting over a read already running', async () => {
    const { result } = renderHook(() => useDuelsByIds([1, 2], { chainId: DEFAULT_CHAIN.id }));

    await act(() => result.current.refetch());

    expect(chain.refetchPages.mock.calls).toEqual([[]]);
  });
});
