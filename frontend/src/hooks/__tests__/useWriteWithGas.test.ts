// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { HttpRequestError } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WriteConfig } from '@/hooks/useWriteWithGas';
import { DEFAULT_CHAIN } from '@/lib/constants';

type ReceiptRetry = (failureCount: number, error: Error) => boolean;

function idleReceipt() {
  return { isLoading: false, isSuccess: false, data: undefined, error: null as Error | null };
}

const wagmi = vi.hoisted(() => ({
  publicClient: {} as object | undefined,
  writeHash: undefined as `0x${string}` | undefined,
  receipt: undefined as unknown as ReturnType<typeof idleReceipt>,
  receiptRetry: undefined as ReceiptRetry | undefined,
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
  useWaitForTransactionReceipt: (config: { query?: { retry?: ReceiptRetry } }) => {
    wagmi.receiptRetry = config.query?.retry;
    return wagmi.receipt;
  },
}));

vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () => ({ activeWallet: { walletClientType: 'metamask' } }),
}));

vi.mock('@/hooks/useRelayerStatus', () => ({
  useRelayerStatus: () => ({ isRelayEnabled: false, forwarderAddress: undefined, isRelayResolved: true }),
}));

const { useWriteWithGas } = await import('@/hooks/useWriteWithGas');

const HASH = `0x${'a'.repeat(64)}` as const;
const CONFIG = {
  address: '0x3333333333333333333333333333333333333333',
  abi: [],
  functionName: 'cancelDuel',
  args: [1n],
  chainId: DEFAULT_CHAIN.id,
} as unknown as WriteConfig;

beforeEach(() => {
  wagmi.publicClient = {};
  wagmi.writeHash = undefined;
  wagmi.receipt = idleReceipt();
});

describe('useWriteWithGas — a transaction that reverted after it was sent', () => {
  it('reports the revert as the write error instead of leaving the write confirming forever', () => {
    const revert = new Error('Duel not in Created state');
    wagmi.writeHash = HASH;
    wagmi.receipt.error = revert;

    const { result } = renderHook(() => useWriteWithGas(DEFAULT_CHAIN.id));

    expect(result.current.error).toBe(revert);
    expect(result.current.isConfirming).toBe(false);
    expect(result.current.isSuccess).toBe(false);
  });

  it('does not read the receipt again after a revert, only after the RPC failed', () => {
    renderHook(() => useWriteWithGas(DEFAULT_CHAIN.id));

    expect(wagmi.receiptRetry?.(0, new Error('Duel not in Created state'))).toBe(false);
    expect(wagmi.receiptRetry?.(0, new HttpRequestError({ url: 'https://rpc.example' }))).toBe(true);
  });
});

describe('useWriteWithGas — an injected wallet whose clients are not ready', () => {
  it('reports the failed guard as the write error instead of only logging it', async () => {
    wagmi.publicClient = undefined;
    const { result } = renderHook(() => useWriteWithGas(DEFAULT_CHAIN.id));

    await act(() => result.current.writeWithGas(CONFIG));

    expect(result.current.error?.message).toBe('Wallet or RPC client not ready');
  });
});
