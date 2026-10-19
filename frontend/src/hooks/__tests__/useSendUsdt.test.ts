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
  canWrite: true,
  isSuccess: false,
  switchChainAsync: vi.fn(async () => undefined),
  writeWithGas: vi.fn(async () => undefined),
  reset: vi.fn(),
}));

vi.mock('wagmi', () => ({
  useAccount: () => ({ chainId: wallet.chainId }),
  useSwitchChain: () => ({ switchChainAsync: wallet.switchChainAsync }),
}));

vi.mock('@/hooks/useWriteWithGas', () => ({
  useWriteWithGas: () => ({
    writeWithGas: wallet.writeWithGas,
    canWrite: wallet.canWrite,
    hash: undefined,
    isPending: false,
    isConfirming: false,
    isSuccess: wallet.isSuccess,
    error: null,
    reset: wallet.reset,
  }),
}));

const emitBalanceRefreshBurst = vi.hoisted(() => vi.fn());
vi.mock('@/lib/balanceRefresh', () => ({ emitBalanceRefreshBurst }));

const { useSendUsdt } = await import('@/hooks/useSendUsdt');

beforeEach(() => {
  wallet.chainId = SEPOLIA;
  wallet.canWrite = true;
  wallet.isSuccess = false;
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
    let switched = () => {};
    wallet.switchChainAsync.mockImplementationOnce(() => new Promise<undefined>((resolve) => {
      switched = () => {
        wallet.chainId = ONE;
        resolve(undefined);
      };
    }));
    const { result, rerender } = renderHook(() => useSendUsdt(ONE));

    let sending = Promise.resolve();
    act(() => {
      sending = result.current.send(TO, 1n);
    });
    expect(wallet.switchChainAsync).toHaveBeenCalledWith({ chainId: ONE });
    expect(wallet.writeWithGas).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      switched();
      await sending;
    });
    rerender();

    expect(wallet.writeWithGas).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ chainId: ONE, address: USDT_ADDRESSES[ONE] }));
  });

  it('sends a transfer once, however often the wallet re-renders', async () => {
    const { result, rerender } = renderHook(() => useSendUsdt(SEPOLIA));

    await act(() => result.current.send(TO, 1n));
    wallet.canWrite = false;
    rerender();
    wallet.canWrite = true;
    rerender();

    expect(wallet.writeWithGas).toHaveBeenCalledOnce();
  });

  it('holds the transfer until the wallet can sign on its network', async () => {
    wallet.canWrite = false;
    const { result, rerender } = renderHook(() => useSendUsdt(SEPOLIA));

    await act(() => result.current.send(TO, 1n));
    expect(wallet.writeWithGas).not.toHaveBeenCalled();

    wallet.canWrite = true;
    rerender();

    expect(wallet.writeWithGas).toHaveBeenCalledOnce();
  });

  it('sends nothing when the wallet will not change networks, and says so', async () => {
    wallet.switchChainAsync.mockRejectedValueOnce(new Error('User rejected the request.'));
    const { result } = renderHook(() => useSendUsdt(ONE));

    await act(() => result.current.send(TO, 1n));

    expect(wallet.writeWithGas).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);
    expect(result.current.error?.message).toBe('User rejected the request.');
  });

  it('forgets a transfer still waiting for the wallet when it is reset', async () => {
    const { result, rerender } = renderHook(() => useSendUsdt(ONE));
    await act(() => result.current.send(TO, 1n));

    act(() => result.current.reset());
    wallet.chainId = ONE;
    rerender();

    expect(wallet.writeWithGas).not.toHaveBeenCalled();
    expect(wallet.reset).toHaveBeenCalled();
  });

  it('has every balance read again once the transfer went through', () => {
    const { rerender } = renderHook(() => useSendUsdt(SEPOLIA));
    expect(emitBalanceRefreshBurst).not.toHaveBeenCalled();

    wallet.isSuccess = true;
    rerender();

    expect(emitBalanceRefreshBurst).toHaveBeenCalledOnce();
  });
});
