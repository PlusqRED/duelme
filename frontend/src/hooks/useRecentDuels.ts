'use client';

import { useMemo } from 'react';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { recentDuelsOf } from '@/lib/duelFeed';
import { useDuelRange } from './useDuelReads';

/** Duels someone joined, newest event first: the recent duels page, and the landing's finished ones. */
export function useRecentDuels() {
  const { duels: duelRecords, isLoading, isError, retry } = useDuelRange({ chainId: DEFAULT_CHAIN_ID });
  const duels = useMemo(() => recentDuelsOf(duelRecords), [duelRecords]);

  return { duels, isLoading, isError, retry };
}
