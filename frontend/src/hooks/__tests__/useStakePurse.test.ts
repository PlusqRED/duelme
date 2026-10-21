// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BalanceReading } from '@/lib/balanceStatus';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';

const reads = vi.hoisted(() => ({
  usdt: { kind: 'ready', raw: 2_000_000n } as BalanceReading,
  walletReader: undefined as string | undefined,
  refetch: vi.fn(),
  fastPoll: vi.fn(),
}));

vi.mock('@/hooks/useWalletBalances', () => ({
  useWalletBalances: (walletAddress: string | undefined) => {
    reads.walletReader = walletAddress;
    return { networks: [{ chain: { id: DEFAULT_CHAIN_ID }, usdt: reads.usdt }], refetch: reads.refetch };
  },
}));
vi.mock('@/hooks/useUsdtBalance', () => ({ useUsdtBalance: reads.fastPoll }));

const { useStakePurse } = await import('@/hooks/useStakePurse');

const WALLET = '0x111111111111111111111111111111111111abcd' as const;
const STAKE = 5_000_000n;

afterEach(() => {
  cleanup();
  reads.usdt = { kind: 'ready', raw: 2_000_000n };
  vi.clearAllMocks();
});

function purse(isShown = true) {
  return renderHook(({ shown }) => useStakePurse(WALLET, STAKE, shown), { initialProps: { shown: isShown } });
}

describe('useStakePurse', () => {
  it('reads no wallet while the stake is not shown against it', () => {
    purse(false);

    expect(reads.walletReader).toBeUndefined();
  });

  it('says how much of the stake the wallet lacks', () => {
    const { result } = purse();

    expect(result.current.shortRaw).toBe(3_000_000n);
  });

  it('lacks nothing while the balance is still being read', () => {
    reads.usdt = { kind: 'checking' };
    const { result } = purse();

    expect(result.current.shortRaw).toBe(0n);
    expect(result.current.shown).toEqual({ kind: 'checking' });
  });

  it('polls as fast as the top-up window while it is open', () => {
    const { result } = purse();

    act(() => result.current.openTopUp());

    expect(reads.fastPoll).toHaveBeenLastCalledWith(DEFAULT_CHAIN_ID, WALLET, true);
  });

  it('keeps the shown balance still while the top-up window is open', () => {
    const { result, rerender } = purse();
    act(() => result.current.openTopUp());

    reads.usdt = { kind: 'ready', raw: 9_000_000n };
    rerender({ shown: true });

    expect(result.current.shown).toEqual({ kind: 'ready', raw: 2_000_000n });
    expect(result.current.balance).toEqual({ kind: 'ready', raw: 9_000_000n });
  });

  it('charges from the old balance once the window closes, Join taking Top up’s place', () => {
    const { result, rerender } = purse();
    act(() => result.current.openTopUp());
    reads.usdt = { kind: 'ready', raw: 9_000_000n };
    rerender({ shown: true });

    act(() => result.current.closeTopUp());

    expect(result.current.shown).toEqual({ kind: 'ready', raw: 9_000_000n });
    expect(result.current.fromRaw).toBe(2_000_000n);
    expect(result.current.isCovered).toBe(true);
  });

  it('charges nothing when the balance drops', () => {
    const { result, rerender } = purse();

    reads.usdt = { kind: 'ready', raw: 1_000_000n };
    rerender({ shown: true });

    expect(result.current.fromRaw).toBeUndefined();
  });

  it('reads the wallet again on retry', () => {
    const { result } = purse();

    result.current.retry();

    expect(reads.refetch).toHaveBeenCalledOnce();
  });
});
