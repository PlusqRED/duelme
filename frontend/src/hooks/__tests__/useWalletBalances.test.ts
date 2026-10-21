// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AVAILABLE_CHAINS, DEFAULT_CHAIN_ID } from '@/lib/constants';

const WALLET = '0x32a3fe56f4fee248e4f19ca3d4374a018ac9aa23';

interface QueryResult {
  status: 'pending' | 'error' | 'success';
  data?: bigint;
  refetch: () => void;
}

interface QueryOptions {
  queryKey: [string, Record<string, unknown>];
  enabled: boolean;
  refetchInterval: number | false;
  select?: (data: { value: bigint }) => bigint;
}

const reads = vi.hoisted(() => ({
  usdt: [] as QueryResult[],
  eth: [] as QueryResult[],
  usdtQueries: [] as QueryOptions[],
  ethQueries: [] as QueryOptions[],
  listeners: new Set<() => void>(),
}));

vi.mock('wagmi', () => ({ useConfig: () => ({}) }));
vi.mock('wagmi/query', () => ({
  readContractQueryOptions: (_config: object, parameters: object) => ({ queryKey: ['readContract', parameters] }),
  getBalanceQueryOptions: (_config: object, parameters: object) => ({ queryKey: ['balance', parameters] }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueries: ({ queries }: { queries: QueryOptions[] }) => {
    if (queries[0]?.queryKey[0] === 'readContract') {
      reads.usdtQueries = queries;
      return reads.usdt;
    }
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

const DUEL_NETWORK = AVAILABLE_CHAINS.findIndex((chain) => chain.id === DEFAULT_CHAIN_ID);

function allQueries() {
  return [...reads.usdt, ...reads.eth];
}

beforeEach(() => {
  reads.usdt = AVAILABLE_CHAINS.map(() => ({ status: 'pending', refetch: vi.fn() }));
  reads.eth = AVAILABLE_CHAINS.map(() => ({ status: 'pending', refetch: vi.fn() }));
  reads.listeners.clear();
});

afterEach(cleanup);

describe('useWalletBalances', () => {
  it('reads USDT and ETH on every network the app lists, for the wallet', () => {
    renderHook(() => useWalletBalances(WALLET, false));

    expect(reads.usdtQueries).toHaveLength(AVAILABLE_CHAINS.length);
    expect(reads.usdtQueries[0]).toMatchObject({
      queryKey: ['readContract', { address: AVAILABLE_CHAINS[0].usdt, functionName: 'balanceOf', args: [WALLET], chainId: AVAILABLE_CHAINS[0].id }],
      enabled: true,
    });
    expect(reads.ethQueries[0]).toMatchObject({ queryKey: ['balance', { address: WALLET, chainId: AVAILABLE_CHAINS[0].id }], enabled: true });
    expect(reads.ethQueries[0].select?.({ value: 7n })).toBe(7n);
  });

  it('reads nothing without a wallet', () => {
    renderHook(() => useWalletBalances(undefined, false));

    expect([...reads.usdtQueries, ...reads.ethQueries].every((query) => !query.enabled)).toBe(true);
  });

  it('polls only the balance on the wallet button while the menu is closed', () => {
    renderHook(() => useWalletBalances(WALLET, false));

    reads.usdtQueries.forEach((query, index) => expect(query.refetchInterval === false).toBe(index !== DUEL_NETWORK));
    reads.ethQueries.forEach((query) => expect(query.refetchInterval).toBe(false));
  });

  it('polls every balance while the menu shows them', () => {
    renderHook(() => useWalletBalances(WALLET, true));

    [...reads.usdtQueries, ...reads.ethQueries].forEach((query) => expect(query.refetchInterval).toBeGreaterThan(0));
  });

  it('keeps each network\'s balances apart, still being read until they are known', () => {
    reads.usdt[0] = { status: 'success', data: 1n, refetch: vi.fn() };
    reads.eth[0] = { status: 'success', data: 7n, refetch: vi.fn() };
    const { result } = renderHook(() => useWalletBalances(WALLET, true));

    expect(result.current.networks[0]).toEqual({ chain: AVAILABLE_CHAINS[0], usdt: { kind: 'ready', raw: 1n }, eth: { kind: 'ready', raw: 7n } });
    if (AVAILABLE_CHAINS.length > 1) {
      expect(result.current.networks[1].eth).toEqual({ kind: 'checking' });
    }
  });

  it('reads everything again when a write says a balance moved', () => {
    renderHook(() => useWalletBalances(WALLET, false));

    act(() => reads.listeners.forEach((listener) => listener()));

    allQueries().forEach((query) => expect(query.refetch).toHaveBeenCalled());
  });

  it('reads everything again on request', () => {
    const { result } = renderHook(() => useWalletBalances(WALLET, false));

    act(() => result.current.refetch());

    allQueries().forEach((query) => expect(query.refetch).toHaveBeenCalled());
  });
});
