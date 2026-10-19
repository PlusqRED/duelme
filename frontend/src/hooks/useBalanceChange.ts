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
 * A balance that was not known, or no longer is, did not move.
 */
export function useBalanceChange(value: bigint | null): BalanceChange | null {
  const [last, setLast] = useState(value);
  const [change, setChange] = useState<BalanceChange | null>(null);

  if (value !== last) {
    setLast(value);
    if (value !== null && last !== null) {
      setChange({ id: (change?.id ?? 0) + 1, delta: value - last });
    }
  }

  return change;
}
