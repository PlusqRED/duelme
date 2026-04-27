'use client';

import { useMemo } from 'react';
import { usePlayerDuels } from './usePlayerDuels';
import { useProfile } from './useProfile';
import { computeTitles, type Title } from '@/lib/profileTitles';

export function useProfileTitles(
  address: `0x${string}` | undefined,
  chainId: number,
): {
  earned: Title[];
  unearned: Title[];
  top3: Title[];
  isLoading: boolean;
} {
  const playerStats = usePlayerDuels(address, chainId);
  const { profile, isLoading: isProfileLoading } = useProfile(address);

  const result = useMemo(() => {
    if (!address) return { earned: [], unearned: [], top3: [] };
    const allDuels = [...playerStats.activeDuels, ...playerStats.historyDuels];
    return computeTitles({
      address,
      duels: allDuels,
      stats: playerStats,
      profile,
    });
  }, [address, playerStats, profile]);

  return {
    ...result,
    isLoading: playerStats.isLoading || isProfileLoading,
  };
}
