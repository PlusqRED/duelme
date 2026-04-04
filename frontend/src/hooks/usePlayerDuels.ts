'use client';

import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { duelMeAbi, DuelState, ACTIVE_STATES } from '@/lib/contracts';
import { DUELME_ADDRESSES, USDT_DECIMALS, ZERO_ADDRESS, CHAIN_NAMES } from '@/lib/constants';

export interface PlayerDuel {
  id: number;
  creator: `0x${string}`;
  opponent: `0x${string}`;
  inviteHash: `0x${string}`;
  message: string;
  wager: number;
  state: DuelState;
  claimedWinner: `0x${string}`;
  claimedBy: `0x${string}`;
  cancelRequestedBy: `0x${string}`;
  createdAt: bigint;
  fundedAt: bigint;
  cancelRequestedAt: bigint;
  claimTimestamp: bigint;
  finalizedAt: bigint;
  creatorPayout: bigint;
  opponentPayout: bigint;
  creatorClaimed: boolean;
  opponentClaimed: boolean;
  chainId: number;
  chainName: string;
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
  const contractAddress = DUELME_ADDRESSES[chainId];
  const enabled =
    !!address &&
    !!contractAddress &&
    contractAddress !== ZERO_ADDRESS;

  // 1. Read total duel count (poll every 10s)
  const { data: duelCount, isLoading: isCountLoading, refetch: refetchCount } = useReadContract({
    address: contractAddress,
    abi: duelMeAbi,
    functionName: 'duelCount',
    chainId,
    query: { enabled, refetchInterval: 10_000, staleTime: 0 },
  });

  // 2. Build multicall to read all duels
  const count = duelCount ? Number(duelCount) : 0;
  const duelContracts = useMemo(() => {
    if (!count || !enabled) return [];
    return Array.from({ length: count }, (_, i) => ({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'getDuel' as const,
      args: [BigInt(i)] as const,
      chainId,
    }));
  }, [count, contractAddress, chainId, enabled]);

  const { data: duelResults, isLoading: isDuelsLoading, refetch: refetchDuels } = useReadContracts({
    contracts: duelContracts,
    query: { enabled: duelContracts.length > 0, refetchInterval: 10_000, staleTime: 0 },
  });

  // 3. Parse and filter duels for this player
  const result = useMemo<PlayerStats>(() => {
    const activeDuels: PlayerDuel[] = [];
    const historyDuels: PlayerDuel[] = [];
    let wins = 0;
    let losses = 0;
    let totalWagered = 0;
    let totalWithdrawn = 0n;

    if (!duelResults || !address) {
      return { wins, losses, totalWagered, totalWithdrawn, activeDuels, historyDuels };
    }

    const addr = address.toLowerCase();

    for (let i = 0; i < duelResults.length; i++) {
      const res = duelResults[i];
      if (res.status !== 'success' || !res.result) continue;

        const d = res.result as {
          creator: `0x${string}`;
          opponent: `0x${string}`;
          wagerAmount: bigint;
          inviteHash: `0x${string}`;
          message: string;
          claimedWinner: `0x${string}`;
          claimedBy: `0x${string}`;
        cancelRequestedBy: `0x${string}`;
        createdAt: bigint;
        fundedAt: bigint;
        cancelRequestedAt: bigint;
        claimTimestamp: bigint;
        finalizedAt: bigint;
        creatorPayout: bigint;
        opponentPayout: bigint;
        creatorClaimed: boolean;
        opponentClaimed: boolean;
        state: number;
      };

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

        const duel: PlayerDuel = {
          id: i,
          creator: d.creator,
          opponent: d.opponent,
          inviteHash: d.inviteHash,
          message: d.message,
          wager,
          state,
        claimedWinner: d.claimedWinner,
        claimedBy: d.claimedBy,
        cancelRequestedBy: d.cancelRequestedBy,
        createdAt: d.createdAt,
        fundedAt: d.fundedAt,
        cancelRequestedAt: d.cancelRequestedAt,
        claimTimestamp: d.claimTimestamp,
        finalizedAt: d.finalizedAt,
        creatorPayout: d.creatorPayout,
        opponentPayout: d.opponentPayout,
        creatorClaimed: d.creatorClaimed,
        opponentClaimed: d.opponentClaimed,
        chainId,
        chainName: CHAIN_NAMES[chainId] ?? `Chain ${chainId}`,
      };

      if (ACTIVE_STATES.has(state)) {
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
  }, [duelResults, address, chainId]);

  return {
    ...result,
    isLoading: isCountLoading || isDuelsLoading,
    refetch: async () => {
      await Promise.all([refetchCount(), refetchDuels()]);
    },
  };
}
