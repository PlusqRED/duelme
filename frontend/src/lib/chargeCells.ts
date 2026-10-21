/** How many cells a stake is drawn as. */
export const CHARGE_CELLS = 10;

export interface ChargeCell {
  /** How much of the cell the wallet covers, from 0 (short) to 1 (lit). */
  fill: number;
  /** Its place among the cells that charge now, or null for a cell that stays as it was. */
  fresh: number | null;
}

export interface ChargeCellsView {
  cells: ChargeCell[];
  /** The wallet covers the whole stake. */
  isFull: boolean;
  /** How many cells charge now. */
  freshCount: number;
}

/** A balance against the stake, in cells: 0 to `CHARGE_CELLS`, to two decimals. */
function cellsCovered(haveRaw: bigint, needRaw: bigint): number {
  if (needRaw <= 0n || haveRaw >= needRaw) {
    return CHARGE_CELLS;
  }
  const covered = haveRaw > 0n ? haveRaw : 0n;
  return Number((covered * BigInt(CHARGE_CELLS) * 100n) / needRaw) / 100;
}

/**
 * A stake as ten cells: lit for what the wallet covers, part-lit where it runs out, short for the
 * rest. `fromRaw`, the balance before money landed, marks the cells it newly covers, in order, so
 * they charge one after another.
 */
export function chargeCells(haveRaw: bigint, needRaw: bigint, fromRaw?: bigint): ChargeCellsView {
  const now = cellsCovered(haveRaw, needRaw);
  const before = fromRaw === undefined ? now : cellsCovered(fromRaw, needRaw);
  let freshCount = 0;
  const cells = Array.from({ length: CHARGE_CELLS }, (_, index): ChargeCell => {
    const fill = Math.max(0, Math.min(1, now - index));
    const was = Math.max(0, Math.min(1, before - index));
    return { fill, fresh: fill > was ? freshCount++ : null };
  });
  return { cells, isFull: now >= CHARGE_CELLS, freshCount };
}
