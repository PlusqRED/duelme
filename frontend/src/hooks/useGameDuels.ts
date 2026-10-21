'use client';

import { useCallback, useMemo } from 'react';
import type { DuelRecord } from '@/lib/duel';
import type { DuelMeta } from '@/lib/game';
import { useDuelsByGame } from './useDuelsByGame';
import { useDuelsByIds } from './useDuelReads';

interface GameDuelsData {
  /** The game's duels as the contract holds them, by id. */
  duels: DuelRecord[];
  /** Each of the game's duels' metadata, by duel id. */
  metaByDuelId: Record<number, DuelMeta>;
  /** Both stakes of every duel someone joined, in USDT's base units. */
  totalVolume: bigint;
  duelsPlayed: number;
}

/** One game's duels: their records, their metadata, and the money and duels the game has seen. */
export function useGameDuels(gameSlug: string | undefined, chainId: number) {
  // Already narrowed to this chain and this deployment by the query, so every id here belongs
  // to the contract we are about to read. Filtering after the fetch is what made a game page
  // empty whenever the backend's row cap was spent on another chain's rows.
  const { duels: metas, isLoading: isMetaLoading, isError: isMetaError, refetch: refetchMetas } = useDuelsByGame(gameSlug, chainId);

  const duelIds = useMemo(() => metas.map((meta) => meta.duelId), [metas]);
  const { duels: duelRecords, isLoading: isDuelsLoading, isError, retry: retryDuels } = useDuelsByIds(duelIds, { chainId });

  const retry = useCallback(async () => {
    await Promise.all([refetchMetas({ cancelRefetch: false }), retryDuels()]);
  }, [refetchMetas, retryDuels]);

  const result = useMemo<GameDuelsData>(() => {
    const metaByDuelId: Record<number, DuelMeta> = Object.fromEntries(metas.map((meta) => [meta.duelId, meta]));
    // Matched by id rather than by position: the records in hand can be one poll behind the
    // metadata, and a positional match would then attach the wrong game to the wrong duel.
    const duels = duelRecords.filter((duel) => duel.id in metaByDuelId);
    const played = duels.filter((duel) => duel.fundedAt > 0n);
    return {
      duels,
      metaByDuelId,
      totalVolume: played.reduce((sum, duel) => sum + duel.wagerAmount * 2n, 0n),
      duelsPlayed: played.length,
    };
  }, [duelRecords, metas]);

  return {
    ...result,
    isLoading: isMetaLoading || isDuelsLoading,
    // Without the game's duel ids nothing is read from the chain, so a failed metadata read is a
    // failed list: the page says so rather than passing for a game nobody has played.
    isError: isMetaError || isError,
    retry,
  };
}
