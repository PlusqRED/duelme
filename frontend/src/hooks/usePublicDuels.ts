'use client';

import { useMemo } from 'react';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { openPublicDuelsOf } from '@/lib/publicDuelsFilters';
import { useDuelRange } from './useDuelReads';

/** The open public duels on the duel network, newest first. */
export function usePublicDuels() {
  const { duels: duelRecords, isLoading, isError, retry } = useDuelRange({ chainId: DEFAULT_CHAIN_ID });
  const duels = useMemo(() => openPublicDuelsOf(duelRecords, DEFAULT_CHAIN_ID), [duelRecords]);

  return { duels, isLoading, isError, retry };
}
