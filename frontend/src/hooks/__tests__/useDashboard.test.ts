// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DuelState } from '@/lib/contracts';
import type { DuelRecord } from '@/lib/duel';
import type { DuelMeta } from '@/lib/game';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const ME = '0x4bfa1486661d6faa5300923bd684f261ae4776a5';
const THEM = '0x1111111111111111111111111111111111111111';
const NOW = 1_800_000_000;
const TIMEOUT = 86_400;

const reads = vi.hoisted(() => ({
  duels: [] as DuelRecord[],
  isError: false,
  metas: {} as Record<number, DuelMeta>,
  metaIds: [] as readonly number[],
}));
vi.mock('@/hooks/useContractConfig', () => ({ useContractConfig: () => ({ claimTimeout: TIMEOUT }) }));
vi.mock('@/hooks/useDuelReads', () => ({
  useDuelRange: () => ({ duels: reads.duels, isLoading: false, isError: reads.isError, refetch: vi.fn(), retry: vi.fn() }),
}));
vi.mock('@/hooks/useDuelMetas', () => ({
  useDuelMetas: (ids: readonly number[]) => {
    reads.metaIds = ids;
    return { metaByDuelId: reads.metas };
  },
}));
vi.mock('@/hooks/useNicknames', () => ({
  useNicknames: () => ({ resolveDisplay: (address: string) => (address === THEM ? 'rival' : address) }),
}));
vi.mock('@/hooks/useNow', () => ({ useClockValue: (select: (now: number) => number) => select(NOW) }));

const { useDashboard } = await import('@/hooks/useDashboard');

function duel(id: number, overrides: Partial<DuelRecord> = {}): DuelRecord {
  return { ...duelView({ creator: ME, opponent: THEM, state: DuelState.Funded, ...overrides }), id };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW * 1000);
  reads.duels = [];
  reads.isError = false;
  reads.metas = {};
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useDashboard', () => {
  it('files the reader\'s duels by whose move it is and the finished ones apart', () => {
    reads.duels = [
      duel(1),
      duel(2, { state: DuelState.WinnerClaimed, claimedBy: ME, claimedWinner: ME, claimTimestamp: BigInt(NOW - 60) }),
      duel(3, { state: DuelState.Resolved, claimedWinner: THEM }),
      duel(4, { creator: THEM, opponent: '0x2222222222222222222222222222222222222222' }),
    ];

    const { result } = renderHook(() => useDashboard(ME));

    expect([result.current.yours, result.current.theirs, result.current.past].map((entries) => entries.map((entry) => entry.duel.id))).toEqual([[1], [2], [3]]);
  });

  it('moves a reported win whose time ran out to the history and its stake into the safe', () => {
    reads.duels = [duel(5, { state: DuelState.WinnerClaimed, claimedBy: THEM, claimedWinner: THEM, claimTimestamp: BigInt(NOW - TIMEOUT - 1) })];

    const { result } = renderHook(() => useDashboard(ME));

    expect([result.current.past.map((entry) => entry.phase), result.current.owed?.items.map((item) => item.kind)]).toEqual([['timeout'], ['late']]);
  });

  it('reads the games of the reader\'s duels only', () => {
    reads.duels = [duel(1), duel(4, { creator: THEM, opponent: '0x2222222222222222222222222222222222222222' })];

    renderHook(() => useDashboard(ME));

    expect(reads.metaIds).toEqual([1]);
  });

  it('names a duel\'s game from its metadata, and none for a duel without one', () => {
    reads.duels = [duel(1), duel(2)];
    reads.metas = { 1: { duelId: 1, chainId: 421614, contractAddress: '0x0', gameSlug: 'chess', gameName: 'Chess', category: 'STRATEGY', creatorAddress: ME, createdAt: null } };

    const { result } = renderHook(() => useDashboard(ME));

    expect([result.current.gameOf(1), result.current.gameOf(2)]).toEqual([{ name: 'Chess', category: 'STRATEGY' }, null]);
  });

  it('names the other players by their nicknames', () => {
    reads.duels = [duel(1)];

    const { result } = renderHook(() => useDashboard(ME));

    expect(result.current.nameOf(THEM)).toBe('rival');
  });

  it('has no duels for a wallet that never played', () => {
    const { result } = renderHook(() => useDashboard(ME));

    expect([result.current.hasDuels, result.current.owed]).toEqual([false, null]);
  });

  it('passes on that part of the history did not load', () => {
    reads.isError = true;

    const { result } = renderHook(() => useDashboard(ME));

    expect(result.current.isError).toBe(true);
  });

  it('offers no sum to take while part of the history did not load, as a smaller one would read as the whole', () => {
    reads.duels = [duel(5, { state: DuelState.WinnerClaimed, claimedBy: THEM, claimedWinner: THEM, claimTimestamp: BigInt(NOW - TIMEOUT - 1) })];
    reads.isError = true;

    const { result } = renderHook(() => useDashboard(ME));

    expect(result.current.owed).toBeNull();
  });
});
