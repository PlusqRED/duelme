import { describe, expect, it } from 'vitest';
import { chargeCells } from '@/lib/chargeCells';

describe('chargeCells', () => {
  it('testChargeCellsLightEveryCellForAWalletThatCovers', () => {
    const view = chargeCells(10_000_000n, 5_000_000n);

    expect(view.cells.every((cell) => cell.fill === 1)).toBe(true);
    expect(view.isFull).toBe(true);
  });

  it('testChargeCellsLeaveEveryCellShortForAnEmptyWallet', () => {
    const view = chargeCells(0n, 5_000_000n);

    expect(view.cells.every((cell) => cell.fill === 0)).toBe(true);
    expect(view.isFull).toBe(false);
  });

  it('testChargeCellsPartLightTheCellWhereTheMoneyRunsOut', () => {
    const view = chargeCells(1_250_000n, 5_000_000n);

    expect(view.cells.map((cell) => cell.fill).slice(0, 4)).toEqual([1, 1, 0.5, 0]);
  });

  it('testChargeCellsCountAStakeOfZeroAsCovered', () => {
    const view = chargeCells(0n, 0n);

    expect(view.isFull).toBe(true);
  });

  it('testChargeCellsChargeOnlyTheCellsTheNewMoneyCovers', () => {
    const view = chargeCells(5_000_000n, 5_000_000n, 3_000_000n);

    expect(view.cells.map((cell) => cell.fresh)).toEqual([null, null, null, null, null, null, 0, 1, 2, 3]);
    expect(view.freshCount).toBe(4);
  });

  it('testChargeCellsChargeNothingWithoutABalanceBefore', () => {
    const view = chargeCells(5_000_000n, 5_000_000n);

    expect(view.freshCount).toBe(0);
  });

  it('testChargeCellsChargeNothingWhenTheBalanceWentDown', () => {
    const view = chargeCells(1_000_000n, 5_000_000n, 4_000_000n);

    expect(view.freshCount).toBe(0);
  });
});
