'use client';

import { useMemo } from 'react';
import { useNicknames } from '@/hooks/useNicknames';
import { usePublicDuelMetas } from '@/hooks/usePublicDuelMetas';
import { usePublicDuels } from '@/hooks/usePublicDuels';
import { useReputationLevels } from '@/hooks/useReputationLevels';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { OPEN_DUELS_SHOWN } from '@/lib/landingDuels';
import { enrichPublicDuel, type EnrichedDuel } from '@/lib/publicDuelsFilters';

/**
 * The newest open public duels the landing shows, each with its game, its creator's name and their
 * record, and how many are open in all.
 */
export function useOpenDuels() {
  const { duels, isLoading, isError, retry } = usePublicDuels();
  const shown = useMemo(() => duels.slice(0, OPEN_DUELS_SHOWN), [duels]);
  const duelIds = useMemo(() => shown.map((duel) => duel.id), [shown]);
  const creators = useMemo(() => shown.map((duel) => duel.creator), [shown]);

  const { metaByDuelId } = usePublicDuelMetas(duelIds, DEFAULT_CHAIN_ID);
  const { resolveDisplay } = useNicknames(creators);
  const { reputationStatsByAddress } = useReputationLevels(creators, DEFAULT_CHAIN_ID);

  const enriched = useMemo<EnrichedDuel[]>(
    () =>
      shown.map((duel) =>
        enrichPublicDuel({
          duel,
          meta: metaByDuelId[duel.id],
          resolveDisplay,
          reputationStatsByAddress,
        })
      ),
    [shown, metaByDuelId, resolveDisplay, reputationStatsByAddress]
  );

  return { duels: enriched, total: duels.length, isLoading, isError, retry };
}
