import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DuelState } from '@/lib/contracts';
import { getContractConfig } from '@/lib/contractConfig';
import type { DuelRecord } from '@/lib/duel';
import { owedBars, owedTo, type OwedItem } from '@/lib/owed';
import { duelView } from './helpers/duelView';

const ME = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const THEM = '0x1111111111111111111111111111111111111111';
const NOW = 1_800_000_000;

function duel(id: number, overrides: Partial<DuelRecord> = {}): DuelRecord {
  return { ...duelView({ creator: ME, opponent: THEM, state: DuelState.Funded, ...overrides }), id };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW * 1000);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('owedTo', () => {
  it('owes nothing when no duel holds money for the player', () => {
    expect(owedTo([duel(1), duel(2, { state: DuelState.Resolved, opponentPayout: 10_000_000n })], ME)).toBeNull();
  });

  it('counts a win the player has not taken, in their seat', () => {
    const owed = owedTo([duel(4, { state: DuelState.Resolved, opponent: ME, creator: THEM, opponentPayout: 10_000_000n })], ME);

    expect(owed).toEqual({
      items: [{ duelId: 4, seat: 'opponent', kind: 'win', raw: 10_000_000n }],
      totalRaw: 10_000_000n,
      hasWin: true,
    });
  });

  it('counts a stake coming back from a refund or a cancel as money back, not a win', () => {
    const owed = owedTo(
      [
        duel(2, { state: DuelState.Refunded, creatorPayout: 5_000_000n }),
        duel(3, { state: DuelState.MutuallyCancelled, creatorPayout: 5_000_000n }),
      ],
      ME
    );

    expect(owed?.items.map((item) => item.kind)).toEqual(['back', 'back']);
    expect(owed?.hasWin).toBe(false);
  });

  it('leaves out what the player has already taken', () => {
    expect(owedTo([duel(5, { state: DuelState.Resolved, creatorPayout: 10_000_000n, creatorClaimed: true })], ME)).toBeNull();
  });

  it('counts the stake of a claim that ran out of time, and not of one still running', () => {
    const timeout = getContractConfig().claimTimeout;
    const late = duel(6, { state: DuelState.WinnerClaimed, claimTimestamp: BigInt(NOW - timeout) });
    const running = duel(7, { state: DuelState.WinnerClaimed, claimTimestamp: BigInt(NOW - timeout + 60) });

    expect(owedTo([late, running], ME)?.items).toEqual([{ duelId: 6, seat: 'creator', kind: 'late', raw: 5_000_000n }]);
  });

  it('lists a win first, then money back, then timed-out claims, the newest duel first within each', () => {
    const late = duel(1, { state: DuelState.WinnerClaimed, claimTimestamp: 1n });
    const owed = owedTo(
      [
        late,
        duel(2, { state: DuelState.Cancelled, creatorPayout: 5_000_000n }),
        duel(3, { state: DuelState.Resolved, creatorPayout: 10_000_000n }),
        duel(8, { state: DuelState.Declined, creatorPayout: 5_000_000n }),
      ],
      ME
    );

    expect(owed?.items.map((item) => item.duelId)).toEqual([3, 8, 2, 1]);
    expect(owed?.totalRaw).toBe(25_000_000n);
  });

  it('matches the player whatever the case of the address', () => {
    expect(owedTo([duel(9, { state: DuelState.Refunded, creatorPayout: 5_000_000n })], ME.toLowerCase())?.totalRaw).toBe(5_000_000n);
  });
});

describe('owedBars', () => {
  const items: OwedItem[] = [1, 2, 3, 4, 5].map((duelId) => ({ duelId, seat: 'creator', kind: 'back', raw: 1_000_000n }));

  it('gives every duel its own bar while they fit', () => {
    expect(owedBars(items.slice(0, 4), 4).map((bar) => bar.kind)).toEqual(['duel', 'duel', 'duel', 'duel']);
  });

  it('puts the duels that do not fit together in the last bar', () => {
    const bars = owedBars(items, 4);

    expect(bars).toHaveLength(4);
    expect(bars[3]).toEqual({ kind: 'more', raw: 2_000_000n, count: 2 });
  });
});
