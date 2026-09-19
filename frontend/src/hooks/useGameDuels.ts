'use client';

import { useMemo } from 'react';
import { DuelState, ACTIVE_STATES } from '@/lib/contracts';
import { isRefundableDuel } from '@/lib/duel';
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

  const { duels: duelRecords, isLoading: isDuelsLoading } = useDuelsByIds(duelIds, { chainId });

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

      if (d.fundedAt > 0n) {
        totalVolume += d.wagerAmount * 2n;
        duelsPlayed++;
      }

      const duel = toPlayerDuel(d, meta.chainId);

      // A claim that timed out is history even though its state is still active: the refund is
      // what is left to do. `isRefundableDuel` is that rule, and `claimTimeout` is adjustable
      // on-chain, so it is not a constant anyone should re-spell.
      if (ACTIVE_STATES.has(state) && !isRefundableDuel(d)) {
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
  };
}
