'use client';

import { useMemo } from 'react';
import { useContractConfig } from '@/hooks/useContractConfig';
import { useDuelRange } from '@/hooks/useDuelReads';
import { useClockValue } from '@/hooks/useNow';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { myDuels, myTotals, phaseClock } from '@/lib/dashboard';
import { duelsOf } from '@/lib/owed';

/**
 * A player's totals on the network duels run on, counted as the dashboard counts the reader's own:
 * wins and losses, what they staked and what they took out. A reported win whose time to answer ran
 * out counts as no winner, so the clock moves it by itself.
 */
export function usePlayerTotals(address: `0x${string}`) {
  const { claimTimeout } = useContractConfig();
  const { duels, isLoading, isError, retry } = useDuelRange({ chainId: DEFAULT_CHAIN_ID });
  const theirs = useMemo(() => duelsOf(duels, address), [duels, address]);
  const now = useClockValue((at) => phaseClock(theirs, at, claimTimeout));
  const totals = useMemo(() => {
    const { yours, theirs: waiting, past } = myDuels(theirs, address, now, claimTimeout);
    return myTotals([...yours, ...waiting, ...past]);
  }, [theirs, address, now, claimTimeout]);

  return { totals, isLoading, isError, retry };
}
