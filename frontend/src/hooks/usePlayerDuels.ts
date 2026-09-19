'use client';

import { useMemo } from 'react';
import { formatUnits } from 'viem';
import { DuelState, ACTIVE_STATES } from '@/lib/contracts';
import { isRefundableDuel } from '@/lib/duel';
import { useDuelRange, type DuelRecord } from './useDuelReads';
import { USDT_DECIMALS, CHAIN_NAMES } from '@/lib/constants';

export interface PlayerDuel extends DuelRecord {
  /** The wager as a display number; `wagerAmountRaw` keeps the exact on-chain value. */
  wager: number;
  wagerAmountRaw: bigint;
  chainId: number;
  chainName: string;
}

/**
 * The one conversion from a duel as the contract returns it to a duel as the screens render it.
 * Two hooks used to build this literal field by field: every field added to the contract's
 * `DuelView` then had to be threaded through both, and `invitedOpponent` was missed in exactly
 * that way.
 */
export function toPlayerDuel(duel: DuelRecord, chainId: number): PlayerDuel {
  return {
    ...duel,
    wager: parseFloat(formatUnits(duel.wagerAmount, USDT_DECIMALS)),
    wagerAmountRaw: duel.wagerAmount,
    chainId,
    chainName: CHAIN_NAMES[chainId] ?? `Chain ${chainId}`,
  };
}

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

      const wager = parseFloat(formatUnits(d.wagerAmount, USDT_DECIMALS));
      const state = d.state as DuelState;

      if (isCreator && d.creatorClaimed) {
        totalWithdrawn += d.creatorPayout;
      }

      if (isOpponent && d.opponentClaimed) {
        totalWithdrawn += d.opponentPayout;
      }

      const duel = toPlayerDuel(d, chainId);

      // A claim that timed out is history even though its state is still active: the refund is
      // what is left to do. `isRefundableDuel` is that rule, and `claimTimeout` is adjustable
      // on-chain, so it is not a constant anyone should re-spell.
      if (ACTIVE_STATES.has(state) && !isRefundableDuel(d)) {
        activeDuels.push(duel);
      } else {
        historyDuels.push(duel);
      }

      // Compute wins/losses from resolved duels
      if (state === DuelState.Resolved) {
        totalWagered += wager;
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
        totalWagered += wager;
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
