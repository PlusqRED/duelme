'use client';

import { useMemo } from 'react';
import { formatUnits } from 'viem';
import { DuelState } from '@/lib/contracts';
import { getRelevantDuelTimestamp } from '@/lib/duel';
import { USDT_DECIMALS, ZERO_ADDRESS, CHAIN_NAMES, DEFAULT_CHAIN_ID } from '@/lib/constants';
import { useDuelRange } from './useDuelReads';

export interface RecentDuel {
  id: number;
  player1: `0x${string}`;
  player2: `0x${string}`;
  wager: number;
  message: string;
  winner: `0x${string}`;
  lastEventAt: bigint;
  claimTimestamp: bigint;
  chainId: number;
  chainName: string;
  state: DuelState;
}


export function useRecentDuels() {
  const { duels: duelRecords, isLoading, isError } = useDuelRange({ chainId: DEFAULT_CHAIN_ID });

  const duels = useMemo<RecentDuel[]>(() => {
    const recent: RecentDuel[] = [];

    for (const d of duelRecords) {
      // `_duelView` reports no opponent until someone joins, so this also drops duels still
      // waiting and duels cancelled before anyone did.
      if (d.opponent === ZERO_ADDRESS) continue;

      const state = d.state as DuelState;
      const lastEventAt = getRelevantDuelTimestamp(d);

      recent.push({
        id: d.id,
        player1: d.creator,
        player2: d.opponent,
        wager: parseFloat(formatUnits(d.wagerAmount, USDT_DECIMALS)),
        message: d.message,
        winner: d.claimedWinner,
        lastEventAt,
        claimTimestamp: d.claimTimestamp,
        chainId: DEFAULT_CHAIN_ID,
        chainName: CHAIN_NAMES[DEFAULT_CHAIN_ID] ?? `Chain ${DEFAULT_CHAIN_ID}`,
        state,
      });
    }

    return recent
      .sort((a, b) => {
        if (a.lastEventAt === b.lastEventAt) {
          return b.id - a.id;
        }

        return a.lastEventAt > b.lastEventAt ? -1 : 1;
      });
  }, [duelRecords]);

  return {
    duels,
    isLoading,
    isError,
  };
}
