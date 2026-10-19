// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { duelView } from '@/lib/__tests__/helpers/duelView';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { DuelState } from '@/lib/contracts';
import type { DuelRecord } from '@/lib/duel';

const WALLET = '0x4bfa1486661d6faa5300923bd684f261ae4776a5';

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

const refunded: DuelRecord = { ...duelView({ creator: WALLET, state: DuelState.Refunded, creatorPayout: 5_000_000n }), id: 3 };

beforeEach(() => {
  range.result = { duels: [refunded], isLoading: false, isError: false };
  range.read.mockClear();
});

describe('useOwed', () => {
  it('reads what is owed from the shared history on the network duels run on', () => {
    const { result } = renderHook(() => useOwed(WALLET));

    expect(range.read).toHaveBeenCalledWith({ chainId: DEFAULT_CHAIN_ID });
    expect(result.current?.totalRaw).toBe(5_000_000n);
  });

  it('owes nothing it can vouch for while the history is read or after the read failed', () => {
    range.result = { duels: [refunded], isLoading: false, isError: true };
    expect(renderHook(() => useOwed(WALLET)).result.current).toBeNull();

    range.result = { duels: [], isLoading: true, isError: false };
    expect(renderHook(() => useOwed(WALLET)).result.current).toBeNull();
  });
});
