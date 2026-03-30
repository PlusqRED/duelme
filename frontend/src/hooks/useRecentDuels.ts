'use client';

import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { duelMeAbi, DuelState } from '@/lib/contracts';
import { DUELME_ADDRESSES, USDT_DECIMALS } from '@/lib/constants';

export interface RecentDuel {
  id: number;
  player1: `0x${string}`;
  player2: `0x${string}`;
  wager: number;
  message: string;
  winner: `0x${string}`;
  lastEventAt: bigint;
  chainId: number;
  chainName: string;
  state: DuelState;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const CHAIN_NAMES: Record<number, string> = {
  421614: 'Arb Sepolia',
  42161: 'Arbitrum One',
};

const DEFAULT_CHAIN_ID = 421614;

export function useRecentDuels() {
  const contractAddress = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];
  const enabled = !!contractAddress && contractAddress !== ZERO_ADDRESS;

  const { data: duelCount, isLoading: isCountLoading } = useReadContract({
    address: contractAddress,
    abi: duelMeAbi,
    functionName: 'duelCount',
    chainId: DEFAULT_CHAIN_ID,
    query: { enabled, refetchInterval: 15_000, staleTime: 0 },
  });

  const count = duelCount ? Number(duelCount) : 0;

  const duelContracts = useMemo(() => {
    if (!count || !enabled) return [];
    return Array.from({ length: count }, (_, i) => ({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'getDuel' as const,
      args: [BigInt(i)] as const,
      chainId: DEFAULT_CHAIN_ID,
    }));
  }, [count, contractAddress, enabled]);

  const { data: duelResults, isLoading: isDuelsLoading } = useReadContracts({
    contracts: duelContracts,
    query: { enabled: duelContracts.length > 0, refetchInterval: 15_000, staleTime: 0 },
  });

  const duels = useMemo<RecentDuel[]>(() => {
    if (!duelResults) return [];

    const recent: RecentDuel[] = [];

    for (let i = 0; i < duelResults.length; i++) {
      const res = duelResults[i];
      if (res.status !== 'success' || !res.result) continue;

      const d = res.result as {
        creator: `0x${string}`;
        opponent: `0x${string}`;
        wagerAmount: bigint;
        message: string;
        claimedWinner: `0x${string}`;
        createdAt: bigint;
        fundedAt: bigint;
        cancelRequestedAt: bigint;
        claimTimestamp: bigint;
        finalizedAt: bigint;
        state: number;
      };

      if (d.opponent === ZERO_ADDRESS) continue;
      if (d.state === DuelState.Created) continue;

      const state = d.state as DuelState;
      const lastEventAt =
        d.finalizedAt > 0n
          ? d.finalizedAt
          : d.cancelRequestedAt > 0n
            ? d.cancelRequestedAt
          : d.claimTimestamp > 0n
            ? d.claimTimestamp
            : d.fundedAt > 0n
              ? d.fundedAt
              : d.createdAt;

      recent.push({
        id: i,
        player1: d.creator,
        player2: d.opponent,
        wager: parseFloat(formatUnits(d.wagerAmount, USDT_DECIMALS)),
        message: d.message,
        winner: d.claimedWinner,
        lastEventAt,
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
  }, [duelResults]);

  return {
    duels,
    isLoading: isCountLoading || isDuelsLoading,
    isError: false,
  };
}
