'use client';

import { useMemo } from 'react';
import { useEnrichedPublicDuels } from '@/hooks/useEnrichedPublicDuels';
import { usePublicDuels } from '@/hooks/usePublicDuels';
import { OPEN_DUELS_SHOWN } from '@/lib/landingDuels';

/**
 * The newest open public duels the landing shows, each with its game, its creator's name and their
 * record, and how many are open in all.
 */
export function useOpenDuels() {
  const { duels, isLoading, isError, retry } = usePublicDuels();
  const shown = useMemo(() => duels.slice(0, OPEN_DUELS_SHOWN), [duels]);
  const enriched = useEnrichedPublicDuels(shown);

  return { duels: enriched, total: duels.length, isLoading, isError, retry };
}
