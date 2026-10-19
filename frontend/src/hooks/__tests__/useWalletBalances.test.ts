// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AVAILABLE_CHAINS } from '@/lib/constants';

const WALLET = '0x32a3fe56f4fee248e4f19ca3d4374a018ac9aa23';

const reads = vi.hoisted(() => ({
  usdt: { data: undefined as unknown, isError: false, refetch: vi.fn() },
  eth: [] as { status: 'pending' | 'error' | 'success'; data?: { value: bigint }; refetch: () => void }[],
  usdtContracts: [] as unknown[],
  ethQueries: [] as unknown[],
  listeners: new Set<() => void>(),
}));

vi.mock('wagmi', () => ({
  useConfig: () => ({}),
  useReadContracts: ({ contracts }: { contracts: unknown[] }) => {
    reads.usdtContracts = contracts;
    return reads.usdt;
  },
}));
vi.mock('wagmi/query', () => ({
  getBalanceQueryOptions: (_config: object, parameters: object) => ({ queryKey: ['balance', parameters] }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueries: ({ queries }: { queries: unknown[] }) => {
    reads.ethQueries = queries;
    return reads.eth;
  },
}));
vi.mock('@/lib/balanceRefresh', () => ({
  subscribeToBalanceRefresh: (listener: () => void) => {
    reads.listeners.add(listener);
    return () => reads.listeners.delete(listener);
  },
}));

const { useWalletBalances } = await import('@/hooks/useWalletBalances');

beforeEach(() => {
  reads.usdt = { data: undefined, isError: false, refetch: vi.fn() };
  reads.eth = AVAILABLE_CHAINS.map(() => ({ status: 'pending' as const, refetch: vi.fn() }));
  reads.listeners.clear();
});

afterEach(cleanup);

describe('useWalletBalances', () => {
  it('reads USDT and ETH on every network the app lists, for the wallet', () => {
    renderHook(() => useWalletBalances(WALLET));

    expect(reads.usdtContracts).toHaveLength(AVAILABLE_CHAINS.length);
    expect(reads.usdtContracts[0]).toMatchObject({ address: AVAILABLE_CHAINS[0].usdt, args: [WALLET], chainId: AVAILABLE_CHAINS[0].id });
    expect(reads.ethQueries[0]).toMatchObject({ queryKey: ['balance', { address: WALLET, chainId: AVAILABLE_CHAINS[0].id }], enabled: true });
  });

  it('reads nothing without a wallet', () => {
    renderHook(() => useWalletBalances(undefined));

    expect(reads.usdtContracts).toEqual([]);
    expect(reads.ethQueries[0]).toMatchObject({ enabled: false });
  });

  it('keeps each network\'s balances apart, still being read until they are known', () => {
    reads.usdt.data = AVAILABLE_CHAINS.map((_, index) => ({ status: 'success', result: BigInt(index + 1) }));
    reads.eth[0] = { status: 'success', data: { value: 7n }, refetch: vi.fn() };
    const { result } = renderHook(() => useWalletBalances(WALLET));

    expect(result.current.networks[0]).toEqual({ chain: AVAILABLE_CHAINS[0], usdt: { kind: 'ready', raw: 1n }, eth: { kind: 'ready', raw: 7n } });
    if (AVAILABLE_CHAINS.length > 1) {
      expect(result.current.networks[1].eth).toEqual({ kind: 'checking' });
    }
  });

  it('reads everything again when a write says a balance moved', () => {
    renderHook(() => useWalletBalances(WALLET));

    act(() => reads.listeners.forEach((listener) => listener()));

    expect(reads.usdt.refetch).toHaveBeenCalled();
    reads.eth.forEach((query) => expect(query.refetch).toHaveBeenCalled());
  });

  it('reads everything again on request, after a read failed', () => {
    const { result } = renderHook(() => useWalletBalances(WALLET));

    act(() => result.current.refetch());

    expect(reads.usdt.refetch).toHaveBeenCalled();
    reads.eth.forEach((query) => expect(query.refetch).toHaveBeenCalled());
  });
});
