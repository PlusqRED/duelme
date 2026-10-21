'use client';

import { useEffect, useMemo, useReducer } from 'react';
import { useDuelRange } from '@/hooks/useDuelReads';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { duelsOf, nextLateAt, owedTo, type Owed } from '@/lib/owed';

/** The longest delay `setTimeout` keeps; a later moment is checked again then. */
const MAX_TIMER_MS = 2_147_483_647;

/**
 * What the contract keeps for this wallet on the network duels run on, from the same paged history
 * read the landing's figures and the duel lists share, so a page that already reads it asks for
 * nothing new. Null while it is read and after a read failed: a short list must not pass for a
 * smaller sum.
 */
export function useOwed(walletAddress: `0x${string}`): Owed | null {
  const { duels, isLoading, isError } = useDuelRange({ chainId: DEFAULT_CHAIN_ID });
  const mine = useMemo(() => duelsOf(duels, walletAddress), [duels, walletAddress]);
  // A claim running out of time changes what is owed with no change in the data, so the answer is
  // worked out on every render, over the player's own duels only, and once more at that moment.
  useRenderAt(nextLateAt(mine));
  return isLoading || isError ? null : owedTo(mine, walletAddress);
}

/** Renders the caller again at `at`, in milliseconds since the epoch. */
function useRenderAt(at: number | null) {
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    if (at === null) {
      return;
    }
    const timer = setTimeout(rerender, Math.min(Math.max(at - Date.now(), 0), MAX_TIMER_MS));
    return () => clearTimeout(timer);
  }, [at]);
}
