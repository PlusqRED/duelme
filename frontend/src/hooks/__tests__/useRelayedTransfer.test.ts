// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPPORTED_CHAINS, USDT_ADDRESSES } from '@/lib/constants';
import { relayedTransferDay, relayedTransferNonce } from '@/lib/relayedTransfer';

const SEPOLIA = SUPPORTED_CHAINS.arbitrumSepolia.id;
const WALLET = '0x4bfa000000000000000000000000000000076a5a';
const NOW = Date.UTC(2026, 9, 26, 21, 30);

const reads = vi.hoisted(() => ({
  isRelayEnabled: true,
  data: undefined as boolean | undefined,
  useReadContract: vi.fn(),
}));

vi.mock('wagmi', () => ({
  useReadContract: (args: unknown) => {
    reads.useReadContract(args);
    return { data: reads.data, refetch: vi.fn() };
  },
}));

vi.mock('@/hooks/useRelayerStatus', () => ({
  useRelayerStatus: () => ({ isRelayEnabled: reads.isRelayEnabled }),
}));

const { useRelayedTransfer } = await import('@/hooks/useRelayedTransfer');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  reads.isRelayEnabled = true;
  reads.data = undefined;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useRelayedTransfer', () => {
  it('asks the token whether the wallet spent today\'s nonce', () => {
    renderHook(() => useRelayedTransfer(SEPOLIA, WALLET));

    expect(reads.useReadContract).toHaveBeenLastCalledWith(
      expect.objectContaining({
        address: USDT_ADDRESSES[SEPOLIA],
        functionName: 'authorizationState',
        args: [WALLET, relayedTransferNonce(relayedTransferDay(NOW))],
        chainId: SEPOLIA,
        query: expect.objectContaining({ enabled: true }),
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

  it('is off, and asks nothing, where DuelMe does not relay', () => {
    reads.isRelayEnabled = false;

    const { result } = renderHook(() => useRelayedTransfer(SEPOLIA, WALLET));

    expect(result.current.status).toBe('off');
    expect(reads.useReadContract).toHaveBeenLastCalledWith(expect.objectContaining({ query: expect.objectContaining({ enabled: false }) }));
  });

  it('says the next one opens at the coming UTC midnight', () => {
    const { result } = renderHook(() => useRelayedTransfer(SEPOLIA, WALLET));

    expect(result.current.nextAt).toBe(Date.UTC(2026, 9, 27));
  });
});
