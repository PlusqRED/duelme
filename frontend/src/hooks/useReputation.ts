'use client';

import { useReadContract } from 'wagmi';
import { duelMeAbi } from '@/lib/contracts';
import { DUELME_ADDRESSES } from '@/lib/constants';
import {
  getReputationLevel,
  wilsonScore,
  type ReputationLevel,
} from '@/lib/reputation';

export interface ReputationData {
  honored: number;
  abandoned: number;
  total: number;
  score: number; // Wilson score 0–1, or -1 for new
  level: ReputationLevel;
  isLoading: boolean;
}

export type { ReputationLevel } from '@/lib/reputation';

export function useReputation(
  address: `0x${string}` | undefined,
  chainId: number
): ReputationData {
  const contractAddress = DUELME_ADDRESSES[chainId];

  const { data, isLoading } = useReadContract({
    address: contractAddress,
    abi: duelMeAbi,
    functionName: 'getPlayerStats',
    args: address ? [address] : undefined,
    chainId,
    query: {
      enabled:
        !!address &&
        !!contractAddress &&
        contractAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  const honored = data ? Number((data as [number, number])[0]) : 0;
  const abandoned = data ? Number((data as [number, number])[1]) : 0;
  const total = honored + abandoned;
  const score = wilsonScore(honored, abandoned);
  const level = getReputationLevel(score, honored, abandoned);

  return { honored, abandoned, total, score, level, isLoading };
}
