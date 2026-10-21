// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FaucetOffer } from '@/lib/faucetApi';

const SEPOLIA = 421614;

const faucet = vi.hoisted(() => ({
  offer: { kind: 'ready', usdtAmountRaw: 100_000_000n, ethAmountWei: 1n } as FaucetOffer,
  isClaiming: false,
  claim: vi.fn(async () => true),
}));
vi.mock('@/hooks/useFaucetClaim', () => ({
  useFaucetClaim: () => ({ offer: faucet.offer, isClaiming: faucet.isClaiming, claim: faucet.claim }),
}));

const { useFaucetFlask } = await import('@/hooks/useFaucetFlask');

function renderFlask(usdtRaw: bigint | null) {
  return renderHook(({ raw }) => useFaucetFlask(SEPOLIA, raw), { initialProps: { raw: usdtRaw } });
}

beforeEach(() => {
  faucet.offer = { kind: 'ready', usdtAmountRaw: 100_000_000n, ethAmountWei: 1n };
  faucet.isClaiming = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useFaucetFlask', () => {
  it('offers the claim', () => {
    const { result } = renderFlask(0n);

    expect(result.current.phase).toBe('ready');
  });

  it('follows a claim the faucet said yes to until its USDT lands', async () => {
    const { result, rerender } = renderFlask(5n);

    await act(() => result.current.claim());
    faucet.offer = { ...faucet.offer, kind: 'claimed' } as FaucetOffer;
    rerender({ raw: 5n });
    expect(result.current.phase).toBe('sent');

    rerender({ raw: 100_000_005n });
    expect(result.current.phase).toBe('landed');
  });

  it('says the claim is made once the menu has shown the money pour in', async () => {
    const { result, rerender } = renderFlask(5n);
    await act(() => result.current.claim());
    faucet.offer = { ...faucet.offer, kind: 'claimed' } as FaucetOffer;
    rerender({ raw: 100_000_005n });

    act(() => result.current.settle());

    expect(result.current.phase).toBe('claimed');
  });

  it('does not follow a claim the faucet turned down', async () => {
    faucet.claim.mockResolvedValueOnce(false);
    const { result } = renderFlask(5n);

    await act(() => result.current.claim());

    expect(result.current.phase).toBe('ready');
  });
});
