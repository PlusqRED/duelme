// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPPORTED_CHAINS, USDT_ADDRESSES } from '@/lib/constants';
import { transferAbi } from '@/lib/contracts';

const SEPOLIA = SUPPORTED_CHAINS.arbitrumSepolia.id;
const ONE = SUPPORTED_CHAINS.arbitrum.id;
const TO = '0x1111111111111111111111111111111111111111';

const wallet = vi.hoisted(() => ({
  chainId: 0,
  isSuccess: false,
  switchError: null as Error | null,
  writeError: null as Error | null,
  switchChainAsync: vi.fn(async () => undefined),
  resetSwitch: vi.fn(),
  writeWithGas: vi.fn(async () => undefined),
  reset: vi.fn(),
}));

vi.mock('wagmi', () => ({
  useAccount: () => ({ chainId: wallet.chainId }),
  useSwitchChain: () => ({ switchChainAsync: wallet.switchChainAsync, error: wallet.switchError, reset: wallet.resetSwitch }),
}));

vi.mock('@/hooks/useWriteWithGas', () => ({
  useWriteWithGas: () => ({
    writeWithGas: wallet.writeWithGas,
    hash: undefined,
    isConfirming: false,
    isSuccess: wallet.isSuccess,
    error: wallet.writeError,
    reset: wallet.reset,
  }),
}));

const emitBalanceRefreshBurst = vi.hoisted(() => vi.fn());
vi.mock('@/lib/balanceRefresh', () => ({ emitBalanceRefreshBurst }));

const { useSendUsdt } = await import('@/hooks/useSendUsdt');

beforeEach(() => {
  wallet.chainId = SEPOLIA;
  wallet.isSuccess = false;
  wallet.switchError = null;
  wallet.writeError = null;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useSendUsdt', () => {
  it('sends a transfer of the network\'s USDT through the write path that fills in gas and nonce', async () => {
    const { result } = renderHook(() => useSendUsdt(SEPOLIA));

    await act(() => result.current.send(TO, 5_000_000n));

    expect(wallet.switchChainAsync).not.toHaveBeenCalled();
    expect(wallet.writeWithGas).toHaveBeenCalledExactlyOnceWith({
      address: USDT_ADDRESSES[SEPOLIA],
      abi: transferAbi,
      functionName: 'transfer',
      args: [TO, 5_000_000n],
      chainId: SEPOLIA,
    });
  });

  it('moves the wallet to the network the money is on, and sends once it is there', async () => {
    const { result } = renderHook(() => useSendUsdt(ONE));

    await act(() => result.current.send(TO, 1n));

    expect(wallet.switchChainAsync).toHaveBeenCalledWith({ chainId: ONE });
    expect(wallet.switchChainAsync.mock.invocationCallOrder[0]).toBeLessThan(wallet.writeWithGas.mock.invocationCallOrder[0]);
    expect(wallet.writeWithGas).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ chainId: ONE, address: USDT_ADDRESSES[ONE] }));
  });

  it('sends nothing when the wallet will not change networks, and says so', async () => {
    wallet.switchChainAsync.mockRejectedValueOnce(new Error('User rejected the request.'));
    const { result, rerender } = renderHook(() => useSendUsdt(ONE));

    await act(() => result.current.send(TO, 1n));
    wallet.switchError = new Error('User rejected the request.');
    rerender();

    expect(wallet.writeWithGas).not.toHaveBeenCalled();
    expect(result.current.error?.message).toBe('User rejected the request.');
  });

  it('reports the write\'s own error when the wallet is already on the network', () => {
    wallet.writeError = new Error('insufficient funds for gas');
    const { result } = renderHook(() => useSendUsdt(SEPOLIA));

    expect(result.current.error?.message).toBe('insufficient funds for gas');
  });

  it('clears the last transfer, its network switch included, before the next one and on reset', async () => {
    const { result } = renderHook(() => useSendUsdt(SEPOLIA));

    await act(() => result.current.send(TO, 1n));
    expect(wallet.resetSwitch).toHaveBeenCalledOnce();
    expect(wallet.reset).toHaveBeenCalledOnce();

    act(() => result.current.reset());
    expect(wallet.resetSwitch).toHaveBeenCalledTimes(2);
    expect(wallet.reset).toHaveBeenCalledTimes(2);
  });

  it('has every balance read again once the transfer went through', () => {
    const { rerender } = renderHook(() => useSendUsdt(SEPOLIA));
    expect(emitBalanceRefreshBurst).not.toHaveBeenCalled();

    wallet.isSuccess = true;
    rerender();

    expect(emitBalanceRefreshBurst).toHaveBeenCalledOnce();
  });
});
