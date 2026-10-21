// @vitest-environment happy-dom
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FaucetClaimError, type FaucetStatus } from '@/lib/faucetApi';

const SEPOLIA = 421614;

const backend = vi.hoisted(() => ({
  status: undefined as FaucetStatus | undefined,
  identityToken: 'token' as string | null,
  claimFaucet: vi.fn(async () => ({})),
}));
const toast = vi.hoisted(() => ({ error: vi.fn() }));
const emitBalanceRefreshBurst = vi.hoisted(() => vi.fn());

vi.mock('@privy-io/react-auth', () => ({ useIdentityToken: () => ({ identityToken: backend.identityToken }) }));
vi.mock('@/hooks/useFaucetStatus', () => ({ FAUCET_STATUS_KEY: 'faucet-status', useFaucetStatus: () => ({ data: backend.status }) }));
vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => toast }));
vi.mock('@/lib/balanceRefresh', () => ({ emitBalanceRefreshBurst }));
vi.mock('@/lib/faucetApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/faucetApi')>()),
  claimFaucet: backend.claimFaucet,
}));

const { useFaucetClaim } = await import('@/hooks/useFaucetClaim');

function renderClaim() {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return { ...renderHook(() => useFaucetClaim(SEPOLIA), { wrapper }), invalidate };
}

beforeEach(() => {
  backend.status = { enabled: true, claimed: false, chainId: SEPOLIA, usdtAmountRaw: 100_000_000n, ethAmountWei: 1n };
  backend.identityToken = 'token';
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useFaucetClaim', () => {
  it('offers what the backend says the faucet gives on this network', () => {
    const { result } = renderClaim();

    expect(result.current.offer).toEqual({ kind: 'ready', usdtAmountRaw: 100_000_000n, ethAmountWei: 1n });
  });

  it('claims, has the balances read again, and asks the backend for the status anew', async () => {
    const { result, invalidate } = renderClaim();

    let claimed = false;
    await act(async () => {
      claimed = await result.current.claim();
    });

    expect(claimed).toBe(true);
    expect(backend.claimFaucet).toHaveBeenCalledWith('token');
    expect(emitBalanceRefreshBurst).toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['faucet-status'] });
  });

  it('claims nothing a second time', async () => {
    backend.status = { enabled: true, claimed: true, chainId: SEPOLIA, usdtAmountRaw: 1n, ethAmountWei: 1n };
    const { result } = renderClaim();

    await act(() => result.current.claim());

    expect(backend.claimFaucet).not.toHaveBeenCalled();
  });

  it('names the reason when the faucet says no', async () => {
    backend.claimFaucet.mockRejectedValueOnce(new FaucetClaimError('already-claimed', 'claimed'));
    const { result } = renderClaim();

    let claimed = true;
    await act(async () => {
      claimed = await result.current.claim();
    });

    expect(claimed).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('toast.faucetAlreadyClaimed');
  });

  it('says the wallet is not ready before it has a token to show the backend', async () => {
    backend.identityToken = null;
    const { result } = renderClaim();

    await act(() => result.current.claim());

    expect(toast.error).toHaveBeenCalledWith('toast.walletNotReady');
    expect(backend.claimFaucet).not.toHaveBeenCalled();
  });
});
