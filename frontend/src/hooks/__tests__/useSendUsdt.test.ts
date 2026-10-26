// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPPORTED_CHAINS, USDT_ADDRESSES } from '@/lib/constants';
import { transferAbi } from '@/lib/contracts';
import { RelayAnswerLostError, RelayRequestError } from '@/lib/relayApi';
import {
  RELAYED_TRANSFER_VALIDITY_SECONDS,
  relayedTransferDay,
  relayedTransferNonce,
  TRANSFER_AUTHORIZATION_TYPES,
} from '@/lib/relayedTransfer';
import { PermitDomainMismatchError } from '@/lib/writeErrors';
import type { FreeTransferStatus, Transfer } from '@/lib/sendUsdt';
import { usdtDomain } from '@/lib/__tests__/helpers/relayTransfer';

const SEPOLIA = SUPPORTED_CHAINS.arbitrumSepolia.id;
const ONE = SUPPORTED_CHAINS.arbitrum.id;
const FROM = '0x4bfa000000000000000000000000000000076a5a';
const TO = '0x1111111111111111111111111111111111111111';
const SIGNATURE = `0x${'22'.repeat(65)}`;
const HASH = `0x${'ab'.repeat(32)}`;
const DOMAIN = usdtDomain(SEPOLIA, USDT_ADDRESSES[SEPOLIA]);
// The chain's latest block, a minute before a UTC midnight the device's clock knows nothing of.
const CHAIN_SECONDS = Date.UTC(2026, 9, 26, 23, 59) / 1000;

const wallet = vi.hoisted(() => ({
  chainId: 0,
  isSuccess: false,
  free: 'available' as FreeTransferStatus,
  switchError: null as Error | null,
  writeError: null as Error | null,
  relayError: null as unknown,
  switchChainAsync: vi.fn(async () => undefined),
  resetSwitch: vi.fn(),
  signTypedDataAsync: vi.fn(async () => `0x${'22'.repeat(65)}`),
  writeWithGas: vi.fn(async () => undefined),
  onSubmitted: vi.fn(),
  reset: vi.fn(),
  refetchFree: vi.fn(async () => undefined),
  submitRelayTransfer: vi.fn(async () => `0x${'ab'.repeat(32)}`),
  readTokenDomain: vi.fn(),
  getBlock: vi.fn(),
  nextAt: 0,
}));

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x4bfa000000000000000000000000000000076a5a', chainId: wallet.chainId }),
  usePublicClient: () => ({ getBlock: wallet.getBlock }),
  useSignTypedData: () => ({ signTypedDataAsync: wallet.signTypedDataAsync }),
  useSwitchChain: () => ({ switchChainAsync: wallet.switchChainAsync, error: wallet.switchError, reset: wallet.resetSwitch }),
}));

vi.mock('@/hooks/useWriteWithGas', () => ({
  useWriteWithGas: () => ({
    writeWithGas: wallet.writeWithGas,
    // Like the real one: the error a send throws ends up on the hook, never thrown at the caller.
    relaySigned: async (send: (onSubmitted: () => void) => Promise<string>) => {
      try {
        await send(wallet.onSubmitted);
      } catch (error) {
        wallet.relayError = error;
      }
    },
    hash: undefined,
    isConfirming: false,
    isSuccess: wallet.isSuccess,
    error: wallet.writeError,
    reset: wallet.reset,
  }),
}));

vi.mock('@/hooks/useRelayedTransfer', () => ({
  useRelayedTransfer: () => ({ status: wallet.free, nextAt: wallet.nextAt, refetch: wallet.refetchFree }),
}));

vi.mock('@/lib/relayApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/relayApi')>()),
  submitRelayTransfer: wallet.submitRelayTransfer,
}));

vi.mock('@/lib/tokenDomain', () => ({ readTokenDomain: wallet.readTokenDomain }));

const emitBalanceRefreshBurst = vi.hoisted(() => vi.fn());
vi.mock('@/lib/balanceRefresh', () => ({ emitBalanceRefreshBurst }));

const { useSendUsdt } = await import('@/hooks/useSendUsdt');

function transfer(route: Transfer['route'], raw = 5_000_000n): Transfer {
  return { to: TO, raw, route };
}

beforeEach(() => {
  wallet.chainId = SEPOLIA;
  wallet.isSuccess = false;
  wallet.free = 'available';
  wallet.switchError = null;
  wallet.writeError = null;
  wallet.relayError = null;
  wallet.nextAt = 0;
  wallet.readTokenDomain.mockResolvedValue(DOMAIN);
  wallet.getBlock.mockResolvedValue({ timestamp: BigInt(CHAIN_SECONDS) });
  wallet.submitRelayTransfer.mockResolvedValue(HASH);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useSendUsdt', () => {
  it('sends a transfer the wallet pays for through the write path that fills in gas and nonce', async () => {
    const { result } = renderHook(() => useSendUsdt(SEPOLIA));

    await act(() => result.current.send(transfer('self')));

    expect(wallet.switchChainAsync).not.toHaveBeenCalled();
    expect(wallet.writeWithGas).toHaveBeenCalledExactlyOnceWith({
      address: USDT_ADDRESSES[SEPOLIA],
      abi: transferAbi,
      functionName: 'transfer',
      args: [TO, 5_000_000n],
      chainId: SEPOLIA,
    });
    expect(wallet.signTypedDataAsync).not.toHaveBeenCalled();
  });

  it('signs the day\'s transfer authorization in the token\'s domain and hands it to the relayer', async () => {
    const { result } = renderHook(() => useSendUsdt(SEPOLIA));

    await act(() => result.current.send(transfer('relay')));

    expect(wallet.writeWithGas).not.toHaveBeenCalled();
    const signed = wallet.signTypedDataAsync.mock.calls[0] as unknown as [Record<string, unknown>];
    // The window and the day are the chain's, which the relayer and the token share; the device's are not.
    expect(signed[0]).toMatchObject({
      account: FROM,
      domain: DOMAIN,
      types: TRANSFER_AUTHORIZATION_TYPES,
      primaryType: 'TransferWithAuthorization',
      message: {
        from: FROM,
        to: TO,
        value: 5_000_000n,
        validAfter: 0n,
        validBefore: BigInt(CHAIN_SECONDS + RELAYED_TRANSFER_VALIDITY_SECONDS),
        nonce: relayedTransferNonce(relayedTransferDay(CHAIN_SECONDS * 1000)),
      },
    });
    expect(wallet.onSubmitted).toHaveBeenCalledOnce();
    expect(wallet.submitRelayTransfer).toHaveBeenCalledExactlyOnceWith(
      SEPOLIA,
      expect.objectContaining({ from: FROM, to: TO, value: '5000000', signature: SIGNATURE })
    );
    expect(wallet.relayError).toBeNull();
  });

  it('has DuelMe pay for the day\'s first transfer and the wallet for the rest', () => {
    const { result, rerender } = renderHook(() => useSendUsdt(SEPOLIA));
    expect(result.current.route).toBe('relay');

    wallet.free = 'used';
    rerender();

    expect(result.current.route).toBe('self');
  });

  it('has the wallet pay itself once the relayer turned its transfer down', async () => {
    wallet.submitRelayTransfer.mockRejectedValueOnce(new RelayRequestError('BUDGET_EXCEEDED', 'spent'));
    const { result } = renderHook(() => useSendUsdt(SEPOLIA));

    await act(() => result.current.send(transfer('relay')));

    expect(result.current.route).toBe('self');
    expect(wallet.refetchFree).toHaveBeenCalled();
  });

  it.each([
    ['whose answer was lost', new RelayAnswerLostError('no answer')],
    ['whose broadcast may have gone out', new RelayRequestError('BROADCAST_UNCERTAIN', 'maybe')],
  ])('keeps a transfer %s with the relayer, which spends the day\'s nonce once', async (_case, error) => {
    wallet.submitRelayTransfer.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useSendUsdt(SEPOLIA));

    await act(() => result.current.send(transfer('relay')));

    expect(result.current.route).toBe('relay');
  });

  it('has the wallet pay itself when the relayed way fails before anything is posted', async () => {
    wallet.readTokenDomain.mockRejectedValueOnce(new PermitDomainMismatchError(USDT_ADDRESSES[SEPOLIA]));
    const { result } = renderHook(() => useSendUsdt(SEPOLIA));

    await act(() => result.current.send(transfer('relay')));

    expect(wallet.submitRelayTransfer).not.toHaveBeenCalled();
    expect(result.current.route).toBe('self');
  });

  it.each([
    ['a player who turned the signature down', 'signTypedDataAsync', new Error('User rejected the request.')],
    ['a network that did not answer', 'getBlock', new Error('HTTP request failed. Status: 503')],
  ] as const)('keeps the relayer after %s, which another go can get past', async (_case, step, error) => {
    wallet[step].mockRejectedValueOnce(error);
    const { result } = renderHook(() => useSendUsdt(SEPOLIA));

    await act(() => result.current.send(transfer('relay')));

    expect(result.current.route).toBe('relay');
  });

  it('asks for no signature once the day\'s transfer reads as used, and says so', async () => {
    const { result, rerender } = renderHook(() => useSendUsdt(SEPOLIA));
    wallet.free = 'used';
    rerender();

    await act(() => result.current.send(transfer('relay')));

    expect(wallet.signTypedDataAsync).not.toHaveBeenCalled();
    expect(wallet.relayError).toMatchObject({ code: 'TRANSFER_USED' });
  });

  it('gets the relayer again once the day has turned', async () => {
    wallet.submitRelayTransfer.mockRejectedValueOnce(new RelayRequestError('RELAYER_UNAVAILABLE', 'busy'));
    const { result, rerender } = renderHook(() => useSendUsdt(SEPOLIA));
    await act(() => result.current.send(transfer('relay')));
    expect(result.current.route).toBe('self');

    wallet.nextAt = 86_400_000;
    rerender();

    expect(result.current.route).toBe('relay');
  });

  it('moves the wallet to the network the money is on, and sends once it is there', async () => {
    const { result } = renderHook(() => useSendUsdt(ONE));

    await act(() => result.current.send(transfer('self', 1n)));

    expect(wallet.switchChainAsync).toHaveBeenCalledWith({ chainId: ONE });
    expect(wallet.switchChainAsync.mock.invocationCallOrder[0]).toBeLessThan(wallet.writeWithGas.mock.invocationCallOrder[0]);
    expect(wallet.writeWithGas).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ chainId: ONE, address: USDT_ADDRESSES[ONE] }));
  });

  it('signs nothing when the wallet will not change networks, and says the network is why', async () => {
    wallet.switchChainAsync.mockRejectedValueOnce(new Error('User rejected the request.'));
    const { result, rerender } = renderHook(() => useSendUsdt(ONE));

    await act(() => result.current.send(transfer('relay', 1n)));
    wallet.switchError = new Error('User rejected the request.');
    rerender();

    expect(wallet.signTypedDataAsync).not.toHaveBeenCalled();
    expect(wallet.writeWithGas).not.toHaveBeenCalled();
    expect(result.current.failure).toMatchObject({ kind: 'network', detail: 'User rejected the request.' });
  });

  it('words the write\'s own error when the wallet is already on the network', () => {
    wallet.writeError = new Error('insufficient funds for gas * price + value');
    const { result } = renderHook(() => useSendUsdt(SEPOLIA));

    expect(result.current.failure).toMatchObject({ kind: 'eth', detail: 'insufficient funds for gas * price + value', canRetry: true });
  });

  it('clears the last transfer, its network switch included, before the next one and on reset', async () => {
    const { result } = renderHook(() => useSendUsdt(SEPOLIA));

    await act(() => result.current.send(transfer('self', 1n)));
    expect(wallet.resetSwitch).toHaveBeenCalledOnce();
    expect(wallet.reset).toHaveBeenCalledOnce();

    act(() => result.current.reset());
    expect(wallet.resetSwitch).toHaveBeenCalledTimes(2);
    expect(wallet.reset).toHaveBeenCalledTimes(2);
  });

  it('has every balance and the day\'s transfer read again once the transfer went through', () => {
    const { rerender } = renderHook(() => useSendUsdt(SEPOLIA));
    expect(emitBalanceRefreshBurst).not.toHaveBeenCalled();

    wallet.isSuccess = true;
    rerender();

    expect(emitBalanceRefreshBurst).toHaveBeenCalledOnce();
    expect(wallet.refetchFree).toHaveBeenCalledOnce();
  });
});
