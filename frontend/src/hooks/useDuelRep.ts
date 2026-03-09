'use client';

import { useReadContract } from 'wagmi';
import { duelMeAbi } from '@/lib/contracts';
import { DUELME_ADDRESSES } from '@/lib/constants';

interface UseDuelRepResult {
  rep: bigint | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useDuelRep(
  address: `0x${string}` | undefined,
  chainId: number
): UseDuelRepResult {
  const contractAddress = DUELME_ADDRESSES[chainId];

  const { data, isLoading, isError } = useReadContract({
    address: contractAddress,
    abi: duelMeAbi,
    functionName: 'getDuelRep',
    args: address ? [address] : undefined,
    chainId,
    query: {
      enabled:
        !!address &&
        !!contractAddress &&
        contractAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  return {
    rep: data as bigint | undefined,
    isLoading,
    isError,
  };
}
