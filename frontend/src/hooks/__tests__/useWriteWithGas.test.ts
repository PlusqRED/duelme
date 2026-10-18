// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WriteConfig } from '@/hooks/useWriteWithGas';

const wagmi = vi.hoisted(() => ({
  publicClient: {} as object | undefined,
  writeHash: undefined as `0x${string}` | undefined,
  receipt: {
    isLoading: false,
    isSuccess: false,
    data: undefined,
    error: null as Error | null,
  },
}));

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1111111111111111111111111111111111111111' }),
  usePublicClient: () => wagmi.publicClient,
  useWalletClient: () => ({ data: undefined }),
  useWriteContract: () => ({
    writeContract: vi.fn(),
    data: wagmi.writeHash,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useWaitForTransactionReceipt: () => wagmi.receipt,
}));

vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () => ({ activeWallet: { walletClientType: 'metamask' } }),
}));

vi.mock('@/hooks/useRelayerStatus', () => ({
  useRelayerStatus: () => ({ isRelayEnabled: false, forwarderAddress: undefined, isRelayResolved: true }),
}));

const { useWriteWithGas } = await import('@/hooks/useWriteWithGas');

const CHAIN_ID = 421614;
const CONFIG = {
  address: '0x3333333333333333333333333333333333333333',
  abi: [],
  functionName: 'cancelDuel',
  args: [1n],
  chainId: CHAIN_ID,
} as unknown as WriteConfig;

beforeEach(() => {
  wagmi.publicClient = {};
  wagmi.writeHash = undefined;
  wagmi.receipt = { isLoading: false, isSuccess: false, data: undefined, error: null };
});

describe('useWriteWithGas — a transaction that reverted after it was sent', () => {
  it('reports the revert as the write error instead of leaving the write confirming forever', () => {
    wagmi.writeHash = `0x${'a'.repeat(64)}`;
    // wagmi decodes the revert data into the message as is, the ABI padding included.
    wagmi.receipt = {
      isLoading: false,
      isSuccess: false,
      data: undefined,
      error: new Error('Duel not in Created state\u0000\u0000\u0000\u0000\u0000\u0000\u0000'),
    };

    const { result } = renderHook(() => useWriteWithGas(CHAIN_ID));

    expect(result.current.error?.message).toBe('Duel not in Created state');
    expect(result.current.isConfirming).toBe(false);
    expect(result.current.isSuccess).toBe(false);
  });

  it('keeps the same error object across renders so effects keyed on it run once', () => {
    wagmi.writeHash = `0x${'a'.repeat(64)}`;
    wagmi.receipt = { isLoading: false, isSuccess: false, data: undefined, error: new Error('Nothing to claim') };

    const { result, rerender } = renderHook(() => useWriteWithGas(CHAIN_ID));
    const first = result.current.error;
    rerender();

    expect(result.current.error).toBe(first);
  });
});

describe('useWriteWithGas — an injected wallet whose clients are not ready', () => {
  it('reports the failed guard as the write error instead of only logging it', async () => {
    wagmi.publicClient = undefined;
    const { result } = renderHook(() => useWriteWithGas(CHAIN_ID));

    await act(() => result.current.writeWithGas(CONFIG));

    expect(result.current.error?.message).toBe('Wallet or RPC client not ready');
  });
});
