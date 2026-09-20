'use client';

import { useMemo } from 'react';
import { DuelState } from '@/lib/contracts';
import { isActiveDuel, toPlayerDuel, type PlayerDuel } from '@/lib/duel';
import { useDuelRange } from './useDuelReads';

export interface PlayerStats {
  wins: number;
  losses: number;
  totalWagered: number;
  totalWithdrawn: bigint;
  activeDuels: PlayerDuel[];
  historyDuels: PlayerDuel[];
}

export function usePlayerDuels(
  address: `0x${string}` | undefined,
  chainId: number
) {
  const { duels: duelRecords, isLoading, isError, refetch } = useDuelRange({ chainId, enabled: !!address });

  // Filter the history down to this player's duels.
  const result = useMemo<PlayerStats>(() => {
    const activeDuels: PlayerDuel[] = [];
    const historyDuels: PlayerDuel[] = [];
    let wins = 0;
    let losses = 0;
    let totalWagered = 0;
    let totalWithdrawn = 0n;

    if (!address) {
      return { wins, losses, totalWagered, totalWithdrawn, activeDuels, historyDuels };
    }

    const addr = address.toLowerCase();

    for (const d of duelRecords) {
      const isCreator = d.creator.toLowerCase() === addr;
      const isOpponent = d.opponent.toLowerCase() === addr;
      if (!isCreator && !isOpponent) continue;

      const state = d.state;
      const duel = toPlayerDuel(d, chainId);

      if (isCreator && d.creatorClaimed) {
        totalWithdrawn += d.creatorPayout;
      }

      if (isOpponent && d.opponentClaimed) {
        totalWithdrawn += d.opponentPayout;
      }

      if (isActiveDuel(d)) {
        activeDuels.push(duel);
      } else {
        historyDuels.push(duel);
      }

      // Compute wins/losses from resolved duels
      if (state === DuelState.Resolved) {
        totalWagered += duel.wager;
        if (d.claimedWinner.toLowerCase() === addr) {
          wins++;
        } else {
          losses++;
        }
      } else if (
        state === DuelState.Created
        || state === DuelState.Funded
        || state === DuelState.WinnerClaimed
        || state === DuelState.MutualCancelRequested
      ) {
        totalWagered += duel.wager;
      }
    }

    // Most recent first
    activeDuels.reverse();
    historyDuels.reverse();

    return { wins, losses, totalWagered, totalWithdrawn, activeDuels, historyDuels };
  }, [duelRecords, address, chainId]);

  return {
    ...result,
    isLoading,
    refetch,
    isError,
  };
}
