'use client';

import { useReadContract } from 'wagmi';
import { duelMeAbi } from '@/lib/contracts';
import { DUELME_ADDRESSES } from '@/lib/constants';

export type ReputationLevel = 'new' | 'honorable' | 'fair' | 'unreliable';

export interface ReputationData {
  honored: number;
  abandoned: number;
  total: number;
  score: number; // Wilson score 0–1, or -1 for new
  level: ReputationLevel;
  isLoading: boolean;
}

/**
 * Wilson Score Lower Bound (95% confidence).
 * Same algorithm Reddit uses for ranking.
 * Returns a value between 0 and 1 that accounts for both
 * success rate AND sample size (confidence).
 */
function wilsonScore(honored: number, abandoned: number): number {
  const total = honored + abandoned;
  if (total === 0) return -1;

  const p = honored / total;
  const z = 1.96; // 95% confidence
  const z2 = z * z;
  const n = total;

  const numerator =
    p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  const denominator = 1 + z2 / n;

  return Math.max(0, numerator / denominator);
}

function getLevel(score: number, total: number): ReputationLevel {
  if (total === 0) return 'new';
  if (score >= 0.75) return 'honorable';
  if (score >= 0.4) return 'fair';
  return 'unreliable';
}

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
  const level = getLevel(score, total);

  return { honored, abandoned, total, score, level, isLoading };
}
