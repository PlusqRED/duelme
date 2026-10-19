// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN } from '@/lib/constants';
import { WalletNotReadyError } from '@/lib/writeErrors';

const wallet = vi.hoisted(() => ({ walletClient: {} as object | undefined }));

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1111111111111111111111111111111111111111' }),
  usePublicClient: () => ({}),
  useWalletClient: () => ({ data: wallet.walletClient }),
}));

vi.mock('@/lib/permitSignature', () => ({
  signErc2612Permit: vi.fn(async () => ({ deadline: 0n, v: 27, r: '0x', s: '0x' })),
}));

const { useDuelPermit } = await import('@/hooks/useDuelPermit');

const UNDEPLOYED_CHAIN_ID = 1;

afterEach(() => {
  cleanup();
  wallet.walletClient = {};
});

describe('useDuelPermit', () => {
  it('asks for a wallet that is not ready yet to be tried again', async () => {
    wallet.walletClient = undefined;
    const { result } = renderHook(() => useDuelPermit(DEFAULT_CHAIN.id));

    await expect(result.current(1n)).rejects.toBeInstanceOf(WalletNotReadyError);
  });

  it('names a chain with no deployment instead of calling the wallet not ready', async () => {
    const { result } = renderHook(() => useDuelPermit(UNDEPLOYED_CHAIN_ID));

    const signing = result.current(1n);

    await expect(signing).rejects.not.toBeInstanceOf(WalletNotReadyError);
    await expect(signing).rejects.toThrow(`chain ${UNDEPLOYED_CHAIN_ID}`);
  });
});
