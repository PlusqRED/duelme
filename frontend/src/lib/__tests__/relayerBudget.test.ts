import { beforeEach, describe, expect, it } from 'vitest';
import {
  releaseDailyBudget,
  reserveDailyBudget,
  resetDailyBudgets,
  settleDailyBudget,
} from '@/lib/relayerBudget';

const ALICE = '0x328809Bc894f92807417D2dAD6b7C998c1aFdac6';
const BUDGET = 1_000n;
const GLOBAL = 100_000n;
const LIMITS = { perAddressWei: BUDGET, globalWei: GLOBAL };
const DAY_ONE = new Date('2026-09-13T10:00:00.000Z');
const DAY_ONE_LATE = new Date('2026-09-13T23:59:59.000Z');
const DAY_TWO = new Date('2026-09-14T00:00:01.000Z');

beforeEach(() => {
  resetDailyBudgets();
});

describe('reserveDailyBudget', () => {
  it('admits a request that fits and books the worst case immediately', () => {
    const decision = reserveDailyBudget(ALICE, 400n, LIMITS, DAY_ONE);

    expect(decision).toEqual({ allowed: true, spentWei: 400n, remainingWei: 600n });
  });

  it('accumulates across requests', () => {
    reserveDailyBudget(ALICE, 400n, LIMITS, DAY_ONE);
    const second = reserveDailyBudget(ALICE, 400n, LIMITS, DAY_ONE);

    expect(second).toEqual({ allowed: true, spentWei: 800n, remainingWei: 200n });
  });

  it('refuses a request that would cross the cap and books nothing', () => {
    reserveDailyBudget(ALICE, 900n, LIMITS, DAY_ONE);
    const refused = reserveDailyBudget(ALICE, 200n, LIMITS, DAY_ONE);

    expect(refused).toEqual({ allowed: false, exceeded: 'address', spentWei: 900n, remainingWei: 100n });
    expect(reserveDailyBudget(ALICE, 100n, LIMITS, DAY_ONE).allowed).toBe(true);
  });

  it('admits a request landing exactly on the cap', () => {
    expect(reserveDailyBudget(ALICE, BUDGET, LIMITS, DAY_ONE).allowed).toBe(true);
  });

  it('meters each address separately', () => {
    const bob = '0x1111111111111111111111111111111111111111';
    reserveDailyBudget(ALICE, BUDGET, LIMITS, DAY_ONE);

    expect(reserveDailyBudget(bob, BUDGET, LIMITS, DAY_ONE).allowed).toBe(true);
  });

  it('is case-insensitive about the address', () => {
    reserveDailyBudget(ALICE.toLowerCase(), 600n, LIMITS, DAY_ONE);

    expect(reserveDailyBudget(ALICE.toUpperCase(), 600n, LIMITS, DAY_ONE).allowed).toBe(false);
  });

  it('resets on the UTC day boundary', () => {
    reserveDailyBudget(ALICE, BUDGET, LIMITS, DAY_ONE_LATE);

    expect(reserveDailyBudget(ALICE, BUDGET, LIMITS, DAY_TWO)).toEqual({
      allowed: true,
      spentWei: BUDGET,
      remainingWei: 0n,
    });
  });
});

describe('relayer-wide daily cap', () => {
  const TIGHT = { perAddressWei: BUDGET, globalWei: 1_500n };

  it('stops fresh addresses once the relayer total is spent', () => {
    // Each address is well inside its own allowance; the global ceiling is what bites.
    for (const suffix of ['1', '2'] as const) {
      const address = `0x${suffix.repeat(40)}`;
      expect(reserveDailyBudget(address, 700n, TIGHT, DAY_ONE).allowed, address).toBe(true);
    }

    const third = reserveDailyBudget(`0x${'3'.repeat(40)}`, 700n, TIGHT, DAY_ONE);

    expect(third).toEqual({ allowed: false, exceeded: 'global', spentWei: 1_400n, remainingWei: 100n });
  });

  it('reports which ceiling refused the request', () => {
    reserveDailyBudget(ALICE, BUDGET, TIGHT, DAY_ONE);
    const ownCap = reserveDailyBudget(ALICE, 1n, TIGHT, DAY_ONE);

    expect(ownCap).toMatchObject({ allowed: false, exceeded: 'address' });
  });

  it('books nothing globally when the address cap refuses first', () => {
    reserveDailyBudget(ALICE, BUDGET, TIGHT, DAY_ONE);
    reserveDailyBudget(ALICE, 500n, TIGHT, DAY_ONE);

    // Alice used 1000 of the 1500 global; a different address still gets the remaining 500.
    expect(reserveDailyBudget(`0x${'4'.repeat(40)}`, 500n, TIGHT, DAY_ONE).allowed).toBe(true);
  });

  it('frees global headroom when a reservation settles cheaper', () => {
    reserveDailyBudget(ALICE, 1_000n, TIGHT, DAY_ONE);
    settleDailyBudget(ALICE, 1_000n, 100n, DAY_ONE);

    expect(reserveDailyBudget(`0x${'5'.repeat(40)}`, 1_000n, TIGHT, DAY_ONE).allowed).toBe(true);
  });

  it('resets globally on the UTC day boundary', () => {
    reserveDailyBudget(ALICE, 1_000n, TIGHT, DAY_ONE_LATE);
    reserveDailyBudget(`0x${'6'.repeat(40)}`, 500n, TIGHT, DAY_ONE_LATE);

    expect(reserveDailyBudget(`0x${'7'.repeat(40)}`, 1_000n, TIGHT, DAY_TWO).allowed).toBe(true);
  });
});

describe('settleDailyBudget', () => {
  it('replaces the reservation with the real cost, freeing the difference', () => {
    reserveDailyBudget(ALICE, 900n, LIMITS, DAY_ONE);
    settleDailyBudget(ALICE, 900n, 100n, DAY_ONE);

    expect(reserveDailyBudget(ALICE, 800n, LIMITS, DAY_ONE)).toEqual({
      allowed: true,
      spentWei: 900n,
      remainingWei: 100n,
    });
  });

  it('charges more than reserved without going negative elsewhere', () => {
    reserveDailyBudget(ALICE, 100n, LIMITS, DAY_ONE);
    settleDailyBudget(ALICE, 100n, 500n, DAY_ONE);

    expect(reserveDailyBudget(ALICE, 600n, LIMITS, DAY_ONE).allowed).toBe(false);
  });

  it('never drives the ledger below zero', () => {
    reserveDailyBudget(ALICE, 100n, LIMITS, DAY_ONE);
    settleDailyBudget(ALICE, 5_000n, 0n, DAY_ONE);

    expect(reserveDailyBudget(ALICE, BUDGET, LIMITS, DAY_ONE).allowed).toBe(true);
  });

  it('ignores a settle that arrives after the day rolled over', () => {
    reserveDailyBudget(ALICE, 900n, LIMITS, DAY_ONE_LATE);
    settleDailyBudget(ALICE, 900n, 10n, DAY_TWO);

    // The new day starts clean either way; the stale credit must not carry into it.
    expect(reserveDailyBudget(ALICE, BUDGET, LIMITS, DAY_TWO).allowed).toBe(true);
  });
});

describe('releaseDailyBudget', () => {
  it('hands back the full reservation when the transaction never went out', () => {
    reserveDailyBudget(ALICE, BUDGET, LIMITS, DAY_ONE);
    releaseDailyBudget(ALICE, BUDGET, DAY_ONE);

    expect(reserveDailyBudget(ALICE, BUDGET, LIMITS, DAY_ONE).allowed).toBe(true);
  });
});
