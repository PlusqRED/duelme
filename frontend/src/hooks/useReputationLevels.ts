'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { duelMeAbi } from '@/lib/contracts';
import { DUELME_ADDRESSES, ZERO_ADDRESS } from '@/lib/constants';
import {
  getReputationSummaryFromStats,
  type ReputationLevel,
  type ReputationSummary,
} from '@/lib/reputation';

export function useReputationLevels(addresses: Array<string | undefined>, chainId: number) {
  const contractAddress = DUELME_ADDRESSES[chainId];
  const normalizedAddresses = useMemo(
    () => Array.from(
      new Set(
        addresses
          .filter((address): address is string => Boolean(address) && address !== ZERO_ADDRESS)
          .map((address) => address.toLowerCase())
      )
    ),
    [addresses]
  );

  const statContracts = useMemo(
    () => normalizedAddresses.map((address) => ({
      address: (contractAddress ?? ZERO_ADDRESS) as `0x${string}`,
      abi: duelMeAbi,
      functionName: 'getPlayerStats' as const,
      args: [address as `0x${string}`] as const,
      chainId,
    })),
    [normalizedAddresses, contractAddress, chainId]
  );

  const { data, isLoading } = useReadContracts({
    contracts: statContracts,
    query: {
      enabled:
        statContracts.length > 0
        && !!contractAddress
        && contractAddress !== ZERO_ADDRESS,
      refetchInterval: 30_000,
      staleTime: 0,
    },
  });

  const reputationStatsByAddress = useMemo<Record<string, ReputationSummary>>(() => {
    const result: Record<string, ReputationSummary> = {};

    normalizedAddresses.forEach((address, index) => {
      const statResult = data?.[index];
      if (statResult?.status !== 'success' || !statResult.result) {
        return;
      }

      const honored = Number(statResult.result.duelsHonored);
      const abandoned = Number(statResult.result.duelsAbandoned);
      result[address] = getReputationSummaryFromStats(honored, abandoned);
    });

    return result;
  }, [data, normalizedAddresses]);

  const reputationByAddress = useMemo<Record<string, ReputationLevel>>(() => {
    const result: Record<string, ReputationLevel> = {};
    for (const [address, stats] of Object.entries(reputationStatsByAddress)) {
      result[address] = stats.level;
    }
    return result;
  }, [reputationStatsByAddress]);

  return {
    reputationByAddress,
    reputationStatsByAddress,
    isLoading,
  };
}
