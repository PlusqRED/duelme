'use client';

import { useState } from 'react';

export interface BalanceChange {
  /** New for every move, to key the motion that shows it. */
  id: number;
  /** How much the balance moved: above zero for money in, below for money out. */
  delta: bigint;
}

/**
 * The last time a known balance moved to another known amount, and by how much; null until it has.
 * A balance that was not known, or no longer is, did not move, and one that comes with a new
 * `epoch` (a screen shown anew, not moved to) is where it is, with no move behind it.
 */
export function useBalanceChange(value: bigint | null, epoch = 0): BalanceChange | null {
  const [last, setLast] = useState({ value, epoch });
  const [change, setChange] = useState<BalanceChange | null>(null);

  if (value !== last.value || epoch !== last.epoch) {
    setLast({ value, epoch });
    if (epoch !== last.epoch) {
      setChange(null);
    } else if (value !== null && last.value !== null) {
      setChange({ id: (change?.id ?? 0) + 1, delta: value - last.value });
    }
  }

  return change;
}
