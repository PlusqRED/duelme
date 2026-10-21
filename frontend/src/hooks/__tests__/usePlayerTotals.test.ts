// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DuelState } from '@/lib/contracts';
import type { DuelRecord } from '@/lib/duel';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const PLAYER = '0x4bfa1486661d6faa5300923bd684f261ae4776a5';
const RIVAL = '0x1111111111111111111111111111111111111111';
const NOW = 1_800_000_000;
const TIMEOUT = 86_400;

const reads = vi.hoisted(() => ({ duels: [] as DuelRecord[] }));
vi.mock('@/hooks/useContractConfig', () => ({ useContractConfig: () => ({ claimTimeout: TIMEOUT }) }));
vi.mock('@/hooks/useDuelReads', () => ({
  useDuelRange: () => ({ duels: reads.duels, isLoading: false, isError: false, refetch: vi.fn(), retry: vi.fn() }),
}));
vi.mock('@/hooks/useNow', () => ({ useClockValue: (select: (now: number) => number) => select(NOW) }));

const { usePlayerTotals } = await import('@/hooks/usePlayerTotals');

function duel(id: number, overrides: Partial<DuelRecord> = {}): DuelRecord {
  return { ...duelView({ creator: PLAYER, opponent: RIVAL, state: DuelState.Funded, ...overrides }), id };
}

afterEach(() => {
  cleanup();
});

describe('usePlayerTotals', () => {
  it('counts the player’s wins and losses and leaves other players’ duels out', () => {
    reads.duels = [
      duel(1, { state: DuelState.Resolved, claimedBy: PLAYER, claimedWinner: PLAYER }),
      duel(2, { state: DuelState.Resolved, claimedBy: RIVAL, claimedWinner: RIVAL }),
      duel(3, { creator: RIVAL, opponent: '0x2222222222222222222222222222222222222222', state: DuelState.Resolved, claimedWinner: RIVAL }),
    ];

    const { result } = renderHook(() => usePlayerTotals(PLAYER));

    expect(result.current.totals.wins).toBe(1);
    expect(result.current.totals.losses).toBe(1);
  });

  it('counts a reported win whose time to answer ran out as no win', () => {
    reads.duels = [duel(1, { state: DuelState.WinnerClaimed, claimedBy: PLAYER, claimedWinner: PLAYER, claimTimestamp: BigInt(NOW - TIMEOUT - 1) })];

    const { result } = renderHook(() => usePlayerTotals(PLAYER));

    expect(result.current.totals.wins).toBe(0);
  });
});
