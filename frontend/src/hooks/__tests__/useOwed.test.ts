// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { duelView } from '@/lib/__tests__/helpers/duelView';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { getContractConfig } from '@/lib/contractConfig';
import { DuelState } from '@/lib/contracts';
import type { DuelRecord } from '@/lib/duel';

const WALLET = '0x4bfa1486661d6faa5300923bd684f261ae4776a5';
const NOW = 1_800_000_000;

const range = vi.hoisted(() => ({
  read: vi.fn(),
  result: { duels: [] as DuelRecord[], isLoading: false, isError: false },
}));
vi.mock('@/hooks/useDuelReads', () => ({
  useDuelRange: (options: unknown) => {
    range.read(options);
    return range.result;
  },
}));

const { useOwed } = await import('@/hooks/useOwed');

function record(id: number, overrides: Parameters<typeof duelView>[0]): DuelRecord {
  return { ...duelView({ creator: WALLET, ...overrides }), id };
}

const refunded = record(3, { state: DuelState.Refunded, creatorPayout: 5_000_000n });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW * 1000);
  range.result = { duels: [refunded], isLoading: false, isError: false };
  range.read.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useOwed', () => {
  it('reads what is owed from the shared history on the network duels run on', () => {
    const { result } = renderHook(() => useOwed(WALLET));

    expect(range.read).toHaveBeenCalledWith({ chainId: DEFAULT_CHAIN_ID });
    expect(result.current?.totalRaw).toBe(5_000_000n);
  });

  it('owes nothing it can vouch for after the history failed to read', () => {
    range.result = { duels: [refunded], isLoading: false, isError: true };

    expect(renderHook(() => useOwed(WALLET)).result.current).toBeNull();
  });

  it('owes nothing it can vouch for while the history is still read', () => {
    range.result = { duels: [], isLoading: true, isError: false };

    expect(renderHook(() => useOwed(WALLET)).result.current).toBeNull();
  });

  it('owes the stake of a claim the moment it runs out of time, with no new data', () => {
    const claimed = BigInt(NOW - getContractConfig().claimTimeout + 60);
    range.result = { duels: [record(4, { state: DuelState.WinnerClaimed, claimTimestamp: claimed })], isLoading: false, isError: false };
    const { result } = renderHook(() => useOwed(WALLET));

    act(() => vi.advanceTimersByTime(60_000));

    expect(result.current?.items).toEqual([{ duelId: 4, seat: 'creator', kind: 'late', raw: 5_000_000n }]);
  });
});
