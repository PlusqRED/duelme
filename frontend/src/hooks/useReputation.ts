'use client';

import { useReadContract } from 'wagmi';
import { duelMeAbi } from '@/lib/contracts';
import { DUELME_ADDRESSES, ZERO_ADDRESS } from '@/lib/constants';
import {
  getReputationSummaryFromStats,
  type ReputationLevel,
} from '@/lib/reputation';

export interface ReputationData {
  honored: number;
  abandoned: number;
  total: number;
  score: number; // Wilson score 0–1, or -1 for new
  level: ReputationLevel;
  isLoading: boolean;
  /** The read failed with nothing read before it: the zeros above are not the player's record. */
  isError: boolean;
}

export type { ReputationLevel } from '@/lib/reputation';

export function useReputation(
  address: `0x${string}` | undefined,
  chainId: number
): ReputationData {
  const contractAddress = DUELME_ADDRESSES[chainId];

  const { data, isLoading, isError } = useReadContract({
    address: contractAddress,
    abi: duelMeAbi,
    functionName: 'getPlayerStats',
    args: address ? [address] : undefined,
    chainId,
    query: {
      enabled:
        !!address &&
        !!contractAddress &&
        contractAddress !== ZERO_ADDRESS,
    },
  });

  const summary = getReputationSummaryFromStats(
    data ? Number(data.duelsHonored) : 0,
    data ? Number(data.duelsAbandoned) : 0
  );

  return { ...summary, isLoading, isError: isError && !data };
}
