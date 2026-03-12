'use client';

import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { duelMeAbi } from '@/lib/contracts';
import { DUELME_ADDRESSES } from '@/lib/constants';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_CHAIN_ID = 421614;

interface PlatformStats {
  duelsPlayed: number;
  totalVolumeRaw: bigint;
  isLoading: boolean;
}

export function usePlatformStats(chainId = DEFAULT_CHAIN_ID): PlatformStats {
  const contractAddress = DUELME_ADDRESSES[chainId];
  const enabled = !!contractAddress && contractAddress !== ZERO_ADDRESS;

  const { data: duelCount, isLoading: isCountLoading } = useReadContract({
    address: contractAddress,
    abi: duelMeAbi,
    functionName: 'duelCount',
    chainId,
    query: {
      enabled,
      refetchInterval: 15_000,
      staleTime: 0,
    },
  });

  const count = duelCount ? Number(duelCount) : 0;

  const duelContracts = useMemo(() => {
    if (!enabled || !count) return [];

    return Array.from({ length: count }, (_, index) => ({
      address: contractAddress,
      abi: duelMeAbi,
      functionName: 'getDuel' as const,
      args: [BigInt(index)] as const,
      chainId,
    }));
  }, [count, contractAddress, enabled, chainId]);

  const { data: duelResults, isLoading: isDuelsLoading } = useReadContracts({
    contracts: duelContracts,
    query: {
      enabled: duelContracts.length > 0,
      refetchInterval: 15_000,
      staleTime: 0,
    },
  });

  const stats = useMemo(() => {
    let duelsPlayed = 0;
    let totalVolumeRaw = 0n;

    if (!duelResults) {
      return { duelsPlayed, totalVolumeRaw };
    }

    for (const result of duelResults) {
      if (result.status !== 'success' || !result.result) continue;

      const duel = result.result as {
        wagerAmount: bigint;
        fundedAt: bigint;
      };

      if (duel.fundedAt === 0n) continue;

      duelsPlayed += 1;
      totalVolumeRaw += duel.wagerAmount * 2n;
    }

    return { duelsPlayed, totalVolumeRaw };
  }, [duelResults]);

  return {
    ...stats,
    isLoading: isCountLoading || isDuelsLoading,
  };
}
