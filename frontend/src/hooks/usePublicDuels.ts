'use client';

import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { duelMeAbi, DuelState } from '@/lib/contracts';
import { DUELME_ADDRESSES, USDT_DECIMALS, ZERO_ADDRESS, DEFAULT_CHAIN_ID } from '@/lib/constants';
import { isPublicDuel } from '@/lib/invite';

export interface PublicDuel {
  id: number;
  creator: `0x${string}`;
  wager: number;
  message: string;
  inviteHash: `0x${string}`;
  createdAt: bigint;
  chainId: number;
}

export function usePublicDuels() {
  const contractAddress = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];
  const enabled = !!contractAddress && contractAddress !== ZERO_ADDRESS;

  const { data: duelCount, isLoading: isCountLoading } = useReadContract({
    address: contractAddress,
    abi: duelMeAbi,
    functionName: 'duelCount',
    chainId: DEFAULT_CHAIN_ID,
    query: { enabled, refetchInterval: 10_000, staleTime: 0 },
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
    query: { enabled: duelContracts.length > 0, refetchInterval: 10_000, staleTime: 0 },
  });

  const duels = useMemo<PublicDuel[]>(() => {
    if (!duelResults) return [];

    const open: PublicDuel[] = [];

    for (let i = 0; i < duelResults.length; i++) {
      const res = duelResults[i];
      if (res.status !== 'success' || !res.result) continue;

      const d = res.result as {
        creator: `0x${string}`;
        wagerAmount: bigint;
        inviteHash: `0x${string}`;
        message: string;
        createdAt: bigint;
        state: number;
      };

      if (d.state !== DuelState.Created) continue;
      if (!isPublicDuel(d.inviteHash)) continue;

      open.push({
        id: i,
        creator: d.creator,
        wager: parseFloat(formatUnits(d.wagerAmount, USDT_DECIMALS)),
        message: d.message,
        inviteHash: d.inviteHash,
        createdAt: d.createdAt,
        chainId: DEFAULT_CHAIN_ID,
      });
    }

    return open.reverse();
  }, [duelResults]);

  return {
    duels,
    isLoading: isCountLoading || isDuelsLoading,
  };
}
