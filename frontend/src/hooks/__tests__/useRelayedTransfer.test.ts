// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPPORTED_CHAINS, USDT_ADDRESSES } from '@/lib/constants';
import { relayedTransferDay, relayedTransferNonce } from '@/lib/relayedTransfer';

const SEPOLIA = SUPPORTED_CHAINS.arbitrumSepolia.id;
const WALLET = '0x4bfa000000000000000000000000000000076a5a';
// The device's clock has passed midnight; the chain's latest block has not.
const DEVICE_NOW = Date.UTC(2026, 9, 27, 0, 1);
const CHAIN_NOW = Date.UTC(2026, 9, 26, 23, 59);

const reads = vi.hoisted(() => ({
  isRelayEnabled: true,
  data: undefined as boolean | undefined,
  blockSeconds: undefined as number | undefined,
  useReadContract: vi.fn(),
  useBlock: vi.fn(),
  refetch: vi.fn(async () => undefined),
}));

vi.mock('wagmi', () => ({
  useBlock: (args: unknown) => {
    reads.useBlock(args);
    return { data: reads.blockSeconds === undefined ? undefined : { timestamp: BigInt(reads.blockSeconds) } };
  },
  useReadContract: (args: unknown) => {
    reads.useReadContract(args);
    return { data: reads.data, refetch: reads.refetch };
  },
}));

vi.mock('@/hooks/useRelayerStatus', () => ({
  useRelayerStatus: () => ({ isRelayEnabled: reads.isRelayEnabled }),
}));

const { useRelayedTransfer } = await import('@/hooks/useRelayedTransfer');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(DEVICE_NOW);
  reads.isRelayEnabled = true;
  reads.data = undefined;
  reads.blockSeconds = CHAIN_NOW / 1000;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useRelayedTransfer', () => {
  it('asks the token about the chain\'s day, not the device\'s, polling while the view is open', () => {
    renderHook(() => useRelayedTransfer(SEPOLIA, WALLET));

    expect(reads.useReadContract).toHaveBeenLastCalledWith(
      expect.objectContaining({
        address: USDT_ADDRESSES[SEPOLIA],
        functionName: 'authorizationState',
        args: [WALLET, relayedTransferNonce(relayedTransferDay(CHAIN_NOW))],
        chainId: SEPOLIA,
        query: expect.objectContaining({ enabled: true, refetchInterval: 60_000 }),
      })
    );
  });

  it.each([
    [undefined, 'unknown'],
    [false, 'available'],
    [true, 'used'],
  ] as const)('reads %s as %s', (data, status) => {
    reads.data = data;

    const { result } = renderHook(() => useRelayedTransfer(SEPOLIA, WALLET));

    expect(result.current.status).toBe(status);
  });

  it('knows nothing until the chain\'s time is in', () => {
    reads.blockSeconds = undefined;
    reads.data = false;

    const { result } = renderHook(() => useRelayedTransfer(SEPOLIA, WALLET));

    expect(result.current.status).toBe('unknown');
    expect(reads.useReadContract).toHaveBeenLastCalledWith(expect.objectContaining({ query: expect.objectContaining({ enabled: false }) }));
  });

  it('is off, and asks nothing, where DuelMe does not relay', () => {
    reads.isRelayEnabled = false;

    const { result } = renderHook(() => useRelayedTransfer(SEPOLIA, WALLET));

    expect(result.current.status).toBe('off');
    expect(reads.useBlock).toHaveBeenLastCalledWith(expect.objectContaining({ query: expect.objectContaining({ enabled: false }) }));
    expect(reads.useReadContract).toHaveBeenLastCalledWith(expect.objectContaining({ query: expect.objectContaining({ enabled: false }) }));
  });

  it('reads the status again on request only where it reads it at all', async () => {
    const { result, rerender } = renderHook(() => useRelayedTransfer(SEPOLIA, WALLET));
    await result.current.refetch();
    expect(reads.refetch).toHaveBeenCalledOnce();

    reads.isRelayEnabled = false;
    rerender();
    await result.current.refetch();

    expect(reads.refetch).toHaveBeenCalledOnce();
  });

  it('says the next one opens at the UTC midnight that ends the chain\'s day', () => {
    const { result } = renderHook(() => useRelayedTransfer(SEPOLIA, WALLET));

    expect(result.current.nextAt).toBe(Date.UTC(2026, 9, 27));
  });
});
