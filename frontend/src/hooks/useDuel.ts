'use client';

import { useReadContract } from 'wagmi';
import { duelMeAbi, type Duel, type DuelState } from '@/lib/contracts';
import { DUELME_ADDRESSES } from '@/lib/constants';

interface UseDuelResult {
  duel: Duel | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useDuel(duelId: bigint, chainId: number): UseDuelResult {
  const contractAddress = DUELME_ADDRESSES[chainId];

  const { data, isLoading, isError, refetch } = useReadContract({
    address: contractAddress,
    abi: duelMeAbi,
    functionName: 'getDuel',
    args: [duelId],
    chainId,
    query: {
      enabled: !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  const duel: Duel | undefined = data
      ? {
          creator: data.creator,
          opponent: data.opponent,
          wagerAmount: data.wagerAmount,
          inviteHash: data.inviteHash,
          message: data.message,
          claimedWinner: data.claimedWinner,
          claimedBy: data.claimedBy,
          cancelRequestedBy: data.cancelRequestedBy,
          createdAt: data.createdAt,
          fundedAt: data.fundedAt,
          cancelRequestedAt: data.cancelRequestedAt,
          claimTimestamp: data.claimTimestamp,
          finalizedAt: data.finalizedAt,
          creatorPayout: data.creatorPayout,
          opponentPayout: data.opponentPayout,
          creatorClaimed: data.creatorClaimed,
          opponentClaimed: data.opponentClaimed,
          state: data.state as DuelState,
        }
      : undefined;

  return { duel, isLoading, isError, refetch };
}
