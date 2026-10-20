'use client';

import { useMemo } from 'react';
import { useNicknames } from '@/hooks/useNicknames';
import { useDuelMetas } from '@/hooks/useDuelMetas';
import { useReputationLevels } from '@/hooks/useReputationLevels';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { enrichPublicDuel, type EnrichedDuel, type PublicDuel } from '@/lib/publicDuelsFilters';

/** Open public duels with their game, their creator's name and their creator's record. */
export function useEnrichedPublicDuels(duels: readonly PublicDuel[]): EnrichedDuel[] {
  const duelIds = useMemo(() => duels.map((duel) => duel.id), [duels]);
  const creators = useMemo(() => duels.map((duel) => duel.creator), [duels]);
  const { metaByDuelId } = useDuelMetas(duelIds, DEFAULT_CHAIN_ID);
  const { resolveDisplay } = useNicknames(creators);
  const { reputationStatsByAddress } = useReputationLevels(creators, DEFAULT_CHAIN_ID);

  return useMemo(
    () =>
      duels.map((duel) =>
        enrichPublicDuel({
          duel,
          meta: metaByDuelId[duel.id],
          resolveDisplay,
          reputationStatsByAddress,
        })
      ),
    [duels, metaByDuelId, resolveDisplay, reputationStatsByAddress]
  );
}
