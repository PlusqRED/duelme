'use client';

import { useMemo } from 'react';
import { usePlayerDuels } from './usePlayerDuels';
import { useProfile } from './useProfile';
import { computeTitles, type Title, type TitleContext } from '@/lib/profileTitles';

type Progress = { current: number; target: number } | null;

export function useProfileTitles(
  address: `0x${string}` | undefined,
  chainId: number,
): {
  earned: Title[];
  unearned: Title[];
  top3: Title[];
  progressByTitleId: Record<string, Progress>;
  isLoading: boolean;
} {
  const playerStats = usePlayerDuels(address, chainId);
  const { profile, isLoading: isProfileLoading } = useProfile(address);

  const result = useMemo(() => {
    if (!address) {
      return {
        earned: [],
        unearned: [],
        top3: [],
        progressByTitleId: {} as Record<string, Progress>,
      };
    }
    const ctx: TitleContext = {
      address,
      duels: [...playerStats.activeDuels, ...playerStats.historyDuels],
      stats: playerStats,
      profile,
    };
    const titles = computeTitles(ctx);
    const progressByTitleId = titles.unearned.reduce<Record<string, Progress>>(
      (acc, title) => {
        acc[title.id] = title.progressOf?.(ctx) ?? null;
        return acc;
      },
      {},
    );
    return { ...titles, progressByTitleId };
  }, [address, playerStats, profile]);

  return {
    ...result,
    isLoading: playerStats.isLoading || isProfileLoading,
  };
}
