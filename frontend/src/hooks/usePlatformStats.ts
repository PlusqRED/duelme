'use client';

import { useMemo } from 'react';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { useDuelRange } from './useDuelReads';

interface PlatformStats {
  duelsPlayed: number;
  totalVolumeRaw: bigint;
  isLoading: boolean;
  /** True when a page of the history failed to load, so these totals understate reality. */
  isError: boolean;
}

export function usePlatformStats(chainId = DEFAULT_CHAIN_ID): PlatformStats {
  const { duels: duelRecords, isLoading, isError } = useDuelRange({ chainId });

  const stats = useMemo(() => {
    let duelsPlayed = 0;
    let totalVolumeRaw = 0n;

    for (const duel of duelRecords) {
      if (duel.fundedAt === 0n) continue;

      duelsPlayed += 1;
      totalVolumeRaw += duel.wagerAmount * 2n;
    }

    return { duelsPlayed, totalVolumeRaw };
  }, [duelRecords]);

  return {
    ...stats,
    isLoading,
    isError,
  };
}
