'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { duelMeAbi } from '@/lib/contracts';
import { DUELME_ADDRESSES, ZERO_ADDRESS } from '@/lib/constants';
import { getReputationLevelFromStats, type ReputationLevel } from '@/lib/reputation';

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

  const reputationByAddress = useMemo<Record<string, ReputationLevel>>(() => {
    const result: Record<string, ReputationLevel> = {};

    normalizedAddresses.forEach((address, index) => {
      const statResult = data?.[index];
      if (statResult?.status !== 'success' || !statResult.result) {
        return;
      }

      const [honored, abandoned] = statResult.result as readonly [number, number];
      result[address] = getReputationLevelFromStats(Number(honored), Number(abandoned));
    });

    return result;
  }, [data, normalizedAddresses]);

  return {
    reputationByAddress,
    isLoading,
  };
}
