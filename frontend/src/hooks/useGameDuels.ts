'use client';

import { useCallback, useMemo } from 'react';
import { isActiveDuel, toPlayerDuel, type PlayerDuel } from '@/lib/duel';
import { useDuelsByGame } from './useDuelsByGame';
import { useDuelsByIds } from './useDuelReads';

interface GameDuelsData {
  activeDuels: PlayerDuel[];
  historyDuels: PlayerDuel[];
  totalVolume: bigint;
  duelsPlayed: number;
  activeDuelCount: number;
}

export function useGameDuels(gameSlug: string | undefined, chainId: number) {
  // Already narrowed to this chain and this deployment by the query, so every id here belongs
  // to the contract we are about to read. Filtering after the fetch is what made a game page
  // empty whenever the backend's row cap was spent on another chain's rows.
  const { duels: metas, isLoading: isMetaLoading, isError: isMetaError, refetch: refetchMetas } = useDuelsByGame(gameSlug, chainId);

  const duelIds = useMemo(() => metas.map((meta) => meta.duelId), [metas]);
  // Membership, not lookup: the loop only needs to know whether a record is one of these.
  const gameDuelIds = useMemo(() => new Set(duelIds), [duelIds]);

  const { duels: duelRecords, isLoading: isDuelsLoading, isError, retry: retryDuels } = useDuelsByIds(duelIds, { chainId });

  const retry = useCallback(async () => {
    await Promise.all([refetchMetas({ cancelRefetch: false }), retryDuels()]);
  }, [refetchMetas, retryDuels]);

  const result = useMemo<GameDuelsData>(() => {
    const activeDuels: PlayerDuel[] = [];
    const historyDuels: PlayerDuel[] = [];
    let totalVolume = 0n;
    let duelsPlayed = 0;

    if (!gameDuelIds.size) {
      return { activeDuels, historyDuels, totalVolume, duelsPlayed, activeDuelCount: 0 };
    }

    for (const d of duelRecords) {
      // Match by duel id rather than by position: the records in hand can be one poll behind the
      // metadata, and a positional match would then attach the wrong game to the wrong duel.
      if (!gameDuelIds.has(d.id)) continue;

      if (d.fundedAt > 0n) {
        totalVolume += d.wagerAmount * 2n;
        duelsPlayed++;
      }

      const duel = toPlayerDuel(d, chainId);

      if (isActiveDuel(d)) {
        activeDuels.push(duel);
      } else {
        historyDuels.push(duel);
      }
    }

    activeDuels.reverse();
    historyDuels.reverse();

    return { activeDuels, historyDuels, totalVolume, duelsPlayed, activeDuelCount: activeDuels.length };
  }, [duelRecords, gameDuelIds, chainId]);

  return {
    ...result,
    isLoading: isMetaLoading || isDuelsLoading,
    // Without the game's duel ids nothing is read from the chain, and the page would show a game
    // nobody has played rather than one whose duels did not load.
    isError: isMetaError || isError,
    retry,
  };
}
