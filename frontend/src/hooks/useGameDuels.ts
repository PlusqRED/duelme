'use client';

import { useMemo } from 'react';
import { DuelState } from '@/lib/contracts';
import { isActiveDuel } from '@/lib/duel';
import { useDuelsByGame } from './useDuelsByGame';
import { useDuelsByIds } from './useDuelReads';
import { toPlayerDuel, type PlayerDuel } from './usePlayerDuels';

interface GameDuelsData {
  activeDuels: PlayerDuel[];
  historyDuels: PlayerDuel[];
  totalVolume: bigint;
  duelsPlayed: number;
  activeDuelCount: number;
}

export function useGameDuels(gameSlug: string | undefined, chainId: number) {
  const { duels: metas, isLoading: isMetaLoading } = useDuelsByGame(gameSlug);

  // The backend indexes duel metadata across chains; only the ones on this chain live in the
  // contract we are about to read.
  const metasForChain = useMemo(() => metas.filter((meta) => meta.chainId === chainId), [metas, chainId]);
  const duelIds = useMemo(() => metasForChain.map((meta) => meta.duelId), [metasForChain]);
  const metaByDuelId = useMemo(
    () => new Map(metasForChain.map((meta) => [meta.duelId, meta])),
    [metasForChain]
  );

  const { duels: duelRecords, isLoading: isDuelsLoading, isError } = useDuelsByIds(duelIds, { chainId });

  const result = useMemo<GameDuelsData>(() => {
    const activeDuels: PlayerDuel[] = [];
    const historyDuels: PlayerDuel[] = [];
    let totalVolume = 0n;
    let duelsPlayed = 0;

    if (!metaByDuelId.size) {
      return { activeDuels, historyDuels, totalVolume, duelsPlayed, activeDuelCount: 0 };
    }

    for (const d of duelRecords) {
      // Pair by duel id rather than by position: the records in hand can be one poll behind the
      // metadata, and a positional pair would then attach the wrong game to the wrong duel.
      const meta = metaByDuelId.get(d.id);
      if (!meta) continue;
      const state = d.state as DuelState;

      // The backend keeps duel metadata per (duelId, chainId) and knows nothing about which
      // contract issued the id, so a redeploy leaves it pointing at ids the live contract has
      // never issued. `getDuelsByIds` answers for those with a zeroed `DuelView` — the one read
      // in the app that can return `Nonexistent`, since the paged readers clamp to `duelCount`.
      // Rendered, it is a duel with no creator, no wager and a "not found" badge.
      if (state === DuelState.Nonexistent) continue;

      if (d.fundedAt > 0n) {
        totalVolume += d.wagerAmount * 2n;
        duelsPlayed++;
      }

      const duel = toPlayerDuel(d, meta.chainId);

      if (isActiveDuel(d)) {
        activeDuels.push(duel);
      } else {
        historyDuels.push(duel);
      }
    }

    activeDuels.reverse();
    historyDuels.reverse();

    return { activeDuels, historyDuels, totalVolume, duelsPlayed, activeDuelCount: activeDuels.length };
  }, [duelRecords, metaByDuelId]);

  return {
    ...result,
    isLoading: isMetaLoading || isDuelsLoading,
    isError,
  };
}
