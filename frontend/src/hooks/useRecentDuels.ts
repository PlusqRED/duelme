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
  winner: `0x${string}`;
  chainId: number;
  chainName: string;
  state: DuelState;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const CHAIN_NAMES: Record<number, string> = {
  421614: 'Arb Sepolia',
  42161: 'Arbitrum One',
  137: 'Polygon',
};

// How many recent duels to scan (from the end)
const SCAN_LIMIT = 50;
// How many resolved duels to show
const DISPLAY_LIMIT = 10;

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

  // Read only the last SCAN_LIMIT duels (most recent first)
  const duelContracts = useMemo(() => {
    if (!count || !enabled) return [];
    const start = Math.max(0, count - SCAN_LIMIT);
    return Array.from({ length: count - start }, (_, i) => ({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'getDuel' as const,
      args: [BigInt(start + i)] as const,
      chainId: DEFAULT_CHAIN_ID,
    }));
  }, [count, contractAddress, enabled]);

  const { data: duelResults, isLoading: isDuelsLoading } = useReadContracts({
    contracts: duelContracts,
    query: { enabled: duelContracts.length > 0, refetchInterval: 15_000, staleTime: 0 },
  });

  const duels = useMemo<RecentDuel[]>(() => {
    if (!duelResults) return [];

    const startIndex = Math.max(0, count - SCAN_LIMIT);
    const resolved: RecentDuel[] = [];

    // Iterate backwards (most recent first)
    for (let i = duelResults.length - 1; i >= 0 && resolved.length < DISPLAY_LIMIT; i--) {
      const res = duelResults[i];
      if (res.status !== 'success' || !res.result) continue;

      const d = res.result as {
        creator: `0x${string}`;
        opponent: `0x${string}`;
        wagerAmount: bigint;
        claimedWinner: `0x${string}`;
        state: number;
      };

      if (d.state !== DuelState.Resolved) continue;
      if (d.opponent === ZERO_ADDRESS) continue;

      resolved.push({
        id: startIndex + i,
        player1: d.creator,
        player2: d.opponent,
        wager: parseFloat(formatUnits(d.wagerAmount, USDT_DECIMALS)),
        winner: d.claimedWinner,
        chainId: DEFAULT_CHAIN_ID,
        chainName: CHAIN_NAMES[DEFAULT_CHAIN_ID] ?? `Chain ${DEFAULT_CHAIN_ID}`,
        state: d.state as DuelState,
      });
    }

    return resolved;
  }, [duelResults, count]);

  return {
    duels,
    isLoading: isCountLoading || isDuelsLoading,
    isError: false,
  };
}
