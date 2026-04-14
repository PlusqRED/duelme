'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { duelMeAbi, DuelState, ACTIVE_STATES } from '@/lib/contracts';
import { DUELME_ADDRESSES, USDT_DECIMALS, CHAIN_NAMES } from '@/lib/constants';
import { useDuelsByGame } from './useDuelsByGame';
import type { PlayerDuel } from './usePlayerDuels';

interface GameDuelsData {
  activeDuels: PlayerDuel[];
  historyDuels: PlayerDuel[];
  totalVolume: bigint;
  duelsPlayed: number;
  activeDuelCount: number;
}

export function useGameDuels(gameSlug: string | undefined, chainId: number) {
  const { duels: metas, isLoading: isMetaLoading } = useDuelsByGame(gameSlug);

  const contractAddress = DUELME_ADDRESSES[chainId];

  const duelContracts = useMemo(() => {
    if (!metas.length || !contractAddress) return [];
    return metas.map((m) => ({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'getDuel' as const,
      args: [BigInt(m.duelId)] as const,
      chainId: m.chainId,
    }));
  }, [metas, contractAddress]);

  const { data: duelResults, isLoading: isDuelsLoading } = useReadContracts({
    contracts: duelContracts,
    query: { enabled: duelContracts.length > 0, refetchInterval: 10_000, staleTime: 0 },
  });

  const result = useMemo<GameDuelsData>(() => {
    const activeDuels: PlayerDuel[] = [];
    const historyDuels: PlayerDuel[] = [];
    let totalVolume = 0n;
    let duelsPlayed = 0;

    if (!duelResults || !metas.length) {
      return { activeDuels, historyDuels, totalVolume, duelsPlayed, activeDuelCount: 0 };
    }

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

      const meta = metas[i];
      const wager = parseFloat(formatUnits(d.wagerAmount, USDT_DECIMALS));
      const state = d.state as DuelState;

      if (d.fundedAt > 0n) {
        totalVolume += d.wagerAmount * 2n;
        duelsPlayed++;
      }

      const duel: PlayerDuel = {
        id: meta.duelId,
        creator: d.creator,
        opponent: d.opponent,
        inviteHash: d.inviteHash,
        message: d.message,
        wager,
        wagerAmountRaw: d.wagerAmount,
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
        chainId: meta.chainId,
        chainName: CHAIN_NAMES[meta.chainId] ?? `Chain ${meta.chainId}`,
      };

      if (ACTIVE_STATES.has(state)) {
        activeDuels.push(duel);
      } else {
        historyDuels.push(duel);
      }
    }

    activeDuels.reverse();
    historyDuels.reverse();

    return { activeDuels, historyDuels, totalVolume, duelsPlayed, activeDuelCount: activeDuels.length };
  }, [duelResults, metas]);

  return {
    ...result,
    isLoading: isMetaLoading || isDuelsLoading,
  };
}
