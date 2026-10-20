import { describe, expect, it } from 'vitest';
import { CHARGE_CELL_COUNT, chargeCells } from '@/lib/chargeCells';

const STAKE = 10_000_000n;

describe('chargeCells', () => {
  it('draws the stake as ten cells', () => {
    expect(chargeCells(0n, STAKE).cells).toHaveLength(CHARGE_CELL_COUNT);
  });

  it('lights a cell for each tenth of the stake the wallet covers, and part of the next', () => {
    const fills = chargeCells(4_500_000n, STAKE).cells.map((cell) => cell.fill);

    expect(fills).toEqual([1, 1, 1, 1, 0.5, 0, 0, 0, 0, 0]);
  });

  it('is full once the wallet covers the stake, more money changing nothing', () => {
    const view = chargeCells(25_000_000n, STAKE);

    expect(view.isFull).toBe(true);
    expect(view.cells.every((cell) => cell.fill === 1)).toBe(true);
  });

  it('is full for a stake of nothing', () => {
    expect(chargeCells(0n, 0n).isFull).toBe(true);
  });

  it('charges nothing without a balance from before', () => {
    expect(chargeCells(5_000_000n, STAKE).charging).toBe(0);
  });

  it('charges the cells money just covered, one after another', () => {
    const view = chargeCells(STAKE, STAKE, 4_500_000n);

    expect(view.charging).toBe(6);
    expect(view.cells.slice(4).map((cell) => [cell.isNew, cell.order])).toEqual([
      [true, 0],
      [true, 1],
      [true, 2],
      [true, 3],
      [true, 4],
      [true, 5],
    ]);
  });

  it('leaves the cells that were already lit still', () => {
    expect(chargeCells(STAKE, STAKE, 4_500_000n).cells.slice(0, 4).some((cell) => cell.isNew)).toBe(false);
  });
});
