// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN_ID, LIVE_DATA_POLL_INTERVAL } from '@/lib/constants';

const WALLET = '0x32a3fe56f4fee248e4f19ca3d4374a018ac9aa23';

interface BalanceOptions {
  address?: string;
  chainId: number;
  query: { enabled: boolean; refetchInterval: number | false };
}

const reads = vi.hoisted(() => ({
  result: { status: 'pending', data: undefined } as { status: 'pending' | 'error' | 'success'; data?: { value: bigint } },
  options: null as BalanceOptions | null,
  refetch: vi.fn(async () => undefined),
  listeners: new Set<() => void>(),
}));

vi.mock('wagmi', () => ({
  useBalance: (options: BalanceOptions) => {
    reads.options = options;
    return { ...reads.result, refetch: reads.refetch };
  },
}));
vi.mock('@/lib/balanceRefresh', () => ({
  subscribeToBalanceRefresh: (listener: () => void) => {
    reads.listeners.add(listener);
    return () => reads.listeners.delete(listener);
  },
}));

const { useEthBalance } = await import('@/hooks/useEthBalance');

beforeEach(() => {
  reads.result = { status: 'pending', data: undefined };
  reads.options = null;
  reads.listeners.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useEthBalance', () => {
  it('testUseEthBalanceReadsTheWalletOnTheDuelsNetwork', () => {
    renderHook(() => useEthBalance(DEFAULT_CHAIN_ID, WALLET, true));

    expect(reads.options?.address).toBe(WALLET);
    expect(reads.options?.chainId).toBe(DEFAULT_CHAIN_ID);
    expect(reads.options?.query.refetchInterval).toBe(LIVE_DATA_POLL_INTERVAL);
  });

  it('testUseEthBalanceGivesTheAmountOnceRead', () => {
    reads.result = { status: 'success', data: { value: 7_736_000_000_000_000n } };

    const { result } = renderHook(() => useEthBalance(DEFAULT_CHAIN_ID, WALLET, true));

    expect(result.current.reading).toEqual({ kind: 'ready', raw: 7_736_000_000_000_000n });
  });

  it('testUseEthBalanceSaysAFailedRead', () => {
    reads.result = { status: 'error' };

    const { result } = renderHook(() => useEthBalance(DEFAULT_CHAIN_ID, WALLET, true));

    expect(result.current.reading).toEqual({ kind: 'error' });
  });

  it('testUseEthBalanceReadsNothingWhileOff', () => {
    renderHook(() => useEthBalance(DEFAULT_CHAIN_ID, WALLET, false));

    expect(reads.options?.query.enabled).toBe(false);
    expect(reads.listeners.size).toBe(0);
  });

  it('testUseEthBalanceReadsNothingWithoutAWallet', () => {
    renderHook(() => useEthBalance(DEFAULT_CHAIN_ID, undefined, true));

    expect(reads.options?.query.enabled).toBe(false);
  });

  it('testUseEthBalanceReadsAgainWhenABalanceMoves', () => {
    renderHook(() => useEthBalance(DEFAULT_CHAIN_ID, WALLET, true));

    act(() => reads.listeners.forEach((listener) => listener()));

    expect(reads.refetch).toHaveBeenCalledOnce();
  });

  it('testUseEthBalanceRetryReadsNothingWhileOff', () => {
    const { result } = renderHook(() => useEthBalance(DEFAULT_CHAIN_ID, WALLET, false));

    act(() => result.current.refetch());

    expect(reads.refetch).not.toHaveBeenCalled();
  });
});
