// @vitest-environment happy-dom
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { HttpRequestError, WaitForTransactionReceiptTimeoutError, type TransactionReceipt } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WriteConfig } from '@/hooks/useWriteWithGas';
import { DEFAULT_CHAIN } from '@/lib/constants';
import { TransactionReplacedError, TransactionRevertedError } from '@/lib/writeErrors';

const HASH = `0x${'a'.repeat(64)}` as const;
const CHAIN_CLIENT = { chain: 'the write\'s chain' };

const WAGMI_CONFIG = { config: 'wagmi' };
const EMBEDDED_CLIENT = { client: 'the embedded wallet on the write\'s chain' };
const PARAMS = { gas: 1n, maxFeePerGas: 2n, maxPriorityFeePerGas: 3n, nonce: 4 };

const wagmi = vi.hoisted(() => ({
  publicClient: {} as object | undefined,
  writeHash: undefined as `0x${string}` | undefined,
  walletClientType: 'metamask',
  getWalletClient: vi.fn<(config: object, parameters: { chainId: number }) => Promise<object>>(),
}));
const waitForWriteReceipt = vi.hoisted(() => vi.fn<(client: object, hash: string) => Promise<TransactionReceipt>>());
const broadcastWithFallback = vi.hoisted(() => vi.fn<(params: object) => Promise<`0x${string}`>>());

vi.mock('wagmi', () => ({
  useConfig: () => WAGMI_CONFIG,
  useAccount: () => ({ address: '0x1111111111111111111111111111111111111111' }),
  usePublicClient: ({ chainId }: { chainId: number }) => (chainId === DEFAULT_CHAIN.id ? wagmi.publicClient : undefined),
  useWalletClient: () => ({ data: undefined }),
  useWriteContract: () => ({
    writeContract: vi.fn(),
    data: wagmi.writeHash,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
}));

vi.mock('wagmi/actions', () => ({ getWalletClient: wagmi.getWalletClient }));

vi.mock('@/lib/buildTransactionParams', () => ({ buildTransactionParams: async () => PARAMS }));

vi.mock('@/lib/resilientBroadcast', () => ({ broadcastWithFallback }));

vi.mock('@/lib/writeReceipt', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/writeReceipt')>()),
  waitForWriteReceipt,
}));

vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () => ({ activeWallet: { walletClientType: wagmi.walletClientType } }),
}));

const { useWriteWithGas } = await import('@/hooks/useWriteWithGas');

const CONFIG = {
  address: '0x3333333333333333333333333333333333333333',
  abi: [],
  functionName: 'cancelDuel',
  args: [1n],
  chainId: DEFAULT_CHAIN.id,
} as unknown as WriteConfig;

function renderWrite() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);

  return renderHook(() => useWriteWithGas(DEFAULT_CHAIN.id), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  wagmi.publicClient = CHAIN_CLIENT;
  wagmi.writeHash = undefined;
  wagmi.walletClientType = 'metamask';
});

afterEach(cleanup);

describe('useWriteWithGas — waiting for a sent transaction', () => {
  it('reads the receipt on the chain the write went to, whatever the wallet is on now', async () => {
    wagmi.writeHash = HASH;
    waitForWriteReceipt.mockReturnValue(new Promise(() => {}));

    renderWrite();

    await waitFor(() => expect(waitForWriteReceipt).toHaveBeenCalledWith(CHAIN_CLIENT, HASH));
  });

  it('succeeds with the receipt of a transaction that went through', async () => {
    const mined = { status: 'success', transactionHash: HASH } as TransactionReceipt;
    wagmi.writeHash = HASH;
    waitForWriteReceipt.mockResolvedValue(mined);

    const { result } = renderWrite();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.receipt).toBe(mined);
  });

  it('reports a reverted transaction as the write error instead of leaving it confirming forever', async () => {
    const revert = new TransactionRevertedError('nothing to claim');
    wagmi.writeHash = HASH;
    waitForWriteReceipt.mockRejectedValue(revert);

    const { result } = renderWrite();

    await waitFor(() => expect(result.current.error).toBe(revert));
    expect(result.current.isConfirming).toBe(false);
  });

  it('reports a transaction replaced in the wallet as the write error, since the write never ran', async () => {
    const replaced = new TransactionReplacedError();
    wagmi.writeHash = HASH;
    waitForWriteReceipt.mockRejectedValue(replaced);

    const { result } = renderWrite();

    await waitFor(() => expect(result.current.error).toBe(replaced));
    expect(result.current.isConfirming).toBe(false);
  });

  it('reports no error while the RPC fails to return the receipt, since the transaction may have gone through', async () => {
    wagmi.writeHash = HASH;
    waitForWriteReceipt.mockRejectedValue(new HttpRequestError({ url: 'https://rpc.example' }));

    const { result } = renderWrite();

    await waitFor(() => expect(waitForWriteReceipt).toHaveBeenCalled());
    expect(result.current.error).toBeNull();
    expect(result.current.isConfirming).toBe(true);
  });

  it('keeps confirming when a receipt watch times out, since the transaction may still land', async () => {
    wagmi.writeHash = HASH;
    waitForWriteReceipt.mockRejectedValue(new WaitForTransactionReceiptTimeoutError({ hash: HASH }));

    const { result } = renderWrite();

    await waitFor(() => expect(waitForWriteReceipt).toHaveBeenCalled());
    expect(result.current.error).toBeNull();
    expect(result.current.isConfirming).toBe(true);
  });
});

describe('useWriteWithGas — an injected wallet whose clients are not ready', () => {
  it('reports the failed guard as the write error instead of only logging it', async () => {
    wagmi.publicClient = undefined;
    const { result } = renderWrite();

    await act(() => result.current.writeWithGas(CONFIG));

    expect(result.current.error?.message).toBe('Wallet or RPC client not ready');
  });
});

describe('useWriteWithGas — the embedded wallet', () => {
  beforeEach(() => {
    wagmi.walletClientType = 'privy';
    waitForWriteReceipt.mockReturnValue(new Promise(() => {}));
  });

  it('signs with the wallet\'s client for the write\'s network, read when the write is sent', async () => {
    wagmi.getWalletClient.mockResolvedValue(EMBEDDED_CLIENT);
    broadcastWithFallback.mockResolvedValue(HASH);
    const { result } = renderWrite();

    await act(() => result.current.writeWithGas(CONFIG));

    expect(wagmi.getWalletClient).toHaveBeenCalledExactlyOnceWith(WAGMI_CONFIG, { chainId: DEFAULT_CHAIN.id });
    expect(broadcastWithFallback).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ walletClient: EMBEDDED_CLIENT, ...PARAMS }));
    expect(result.current.hash).toBe(HASH);
  });

  it('sends nothing and reports the wallet as not ready while it cannot sign on the write\'s network', async () => {
    wagmi.getWalletClient.mockRejectedValue(new Error('Chain mismatch'));
    const { result } = renderWrite();

    await act(() => result.current.writeWithGas(CONFIG));

    expect(broadcastWithFallback).not.toHaveBeenCalled();
    expect(result.current.error?.message).toBe('Embedded wallet client not ready');
  });
});
