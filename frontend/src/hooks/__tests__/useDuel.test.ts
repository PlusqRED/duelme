// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN } from '@/lib/constants';

type ReadContractConfig = { query?: Record<string, unknown> };

const useReadContract = vi.hoisted(() =>
  vi.fn<(config: ReadContractConfig) => object>(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }))
);

vi.mock('wagmi', () => ({ useReadContract }));

const { useDuel } = await import('@/hooks/useDuel');

describe('useDuel', () => {
  it('keeps re-reading the duel so the other player\'s moves show without a reload', () => {
    renderHook(() => useDuel(7n, DEFAULT_CHAIN.id));

    const [config] = useReadContract.mock.lastCall ?? [];
    expect(config?.query).toMatchObject({ refetchInterval: 10_000, staleTime: 0 });
  });
});
