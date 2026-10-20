/** The stake is drawn as this many cells. */
export const CHARGE_CELL_COUNT = 10;

export interface ChargeCell {
  /** How much of the cell the wallet covers, from 0 to 1. */
  fill: number;
  /** Covered by money that just landed: it charges, after `order` other new cells. */
  isNew: boolean;
  order: number;
}

export interface ChargeCellsView {
  cells: ChargeCell[];
  /** The wallet covers the whole stake. */
  isFull: boolean;
  /** How many cells charge now. */
  charging: number;
}

function share(haveRaw: bigint, needRaw: bigint): number {
  if (needRaw <= 0n) return 1;
  return Math.min(1, Number(haveRaw) / Number(needRaw));
}

/**
 * A stake as cells against a wallet: lit for what the wallet covers, the last one part lit, the rest
 * short. Given the balance before money landed (`fromRaw`), the cells it newly covers charge one
 * after another.
 */
export function chargeCells(haveRaw: bigint, needRaw: bigint, fromRaw?: bigint): ChargeCellsView {
  const now = share(haveRaw, needRaw) * CHARGE_CELL_COUNT;
  const before = fromRaw === undefined ? now : share(fromRaw, needRaw) * CHARGE_CELL_COUNT;
  let charging = 0;
  const cells = Array.from({ length: CHARGE_CELL_COUNT }, (_, index): ChargeCell => {
    const fill = Math.max(0, Math.min(1, now - index));
    const was = Math.max(0, Math.min(1, before - index));
    const isNew = fill > was;
    return { fill, isNew, order: isNew ? charging++ : 0 };
  });
  return { cells, isFull: now >= CHARGE_CELL_COUNT, charging };
}
