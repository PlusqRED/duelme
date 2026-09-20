'use client';

import { useEffect, useMemo } from 'react';
import { formatUnits } from 'viem';
import { useReadContracts } from 'wagmi';
import { duelMeAbi } from '@/lib/contracts';
import {
  DEFAULT_CHAIN_ID,
  DUELME_ADDRESSES,
  USDT_DECIMALS,
  ZERO_ADDRESS,
} from '@/lib/constants';
import {
  type ContractConfig,
  getContractConfig,
  setContractConfig,
} from '@/lib/contractConfig';

// The parameters only change via rare owner transactions, so a long staleTime
// without polling is enough — unlike duel data, this is not live state.
const CONFIG_STALE_TIME = 5 * 60_000;

/// Reads the owner-adjustable contract parameters (minWager, claimTimeout,
/// maxMessageCodepoints, maxMessageBytes) and keeps the shared contractConfig
/// store in sync so non-hook helpers see the same values.
export function useContractConfig(chainId: number = DEFAULT_CHAIN_ID): ContractConfig {
  const contractAddress = DUELME_ADDRESSES[chainId];

  const { data } = useReadContracts({
    contracts: [
      { address: contractAddress, abi: duelMeAbi, functionName: 'minWager', chainId },
      { address: contractAddress, abi: duelMeAbi, functionName: 'claimTimeout', chainId },
      { address: contractAddress, abi: duelMeAbi, functionName: 'maxMessageCodepoints', chainId },
      { address: contractAddress, abi: duelMeAbi, functionName: 'maxMessageBytes', chainId },
    ],
    query: {
      enabled: !!contractAddress && contractAddress !== ZERO_ADDRESS,
      staleTime: CONFIG_STALE_TIME,
    },
  });

  const config = useMemo(() => {
    const [minWagerRaw, claimTimeout, maxMessageCharacters, maxMessageBytes] = [
      data?.[0]?.result,
      data?.[1]?.result,
      data?.[2]?.result,
      data?.[3]?.result,
    ];
    const next = { ...getContractConfig() };
    if (minWagerRaw !== undefined) {
      next.minWager = Number(formatUnits(minWagerRaw, USDT_DECIMALS));
    }
    if (claimTimeout !== undefined) {
      next.claimTimeout = Number(claimTimeout);
    }
    if (maxMessageCharacters !== undefined) {
      next.maxMessageCharacters = Number(maxMessageCharacters);
    }
    if (maxMessageBytes !== undefined) {
      next.maxMessageBytes = Number(maxMessageBytes);
    }
    return next;
  }, [data]);

  useEffect(() => {
    setContractConfig(config);
  }, [config]);

  return config;
}
