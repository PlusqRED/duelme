'use client';

import { useMemo } from 'react';
import { formatUnits } from 'viem';
import { DuelState } from '@/lib/contracts';
import { USDT_DECIMALS, DEFAULT_CHAIN_ID, ZERO_ADDRESS } from '@/lib/constants';
import { isPublicDuel } from '@/lib/invite';
import { useDuelRange } from './useDuelReads';

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
  const { duels: duelRecords, isLoading, isError } = useDuelRange({ chainId: DEFAULT_CHAIN_ID });

  const duels = useMemo<PublicDuel[]>(() => {
    const open: PublicDuel[] = [];

    for (const d of duelRecords) {
      if (d.state !== DuelState.Created) continue;
      if (!isPublicDuel(d.inviteHash)) continue;
      // A duel can carry no invite hash and still be addressed to one player. Listing it in the
      // open lobby would offer everyone else a Join button that reverts "Not the invited opponent".
      if (d.invitedOpponent !== ZERO_ADDRESS) continue;

      open.push({
        id: d.id,
        creator: d.creator,
        wager: parseFloat(formatUnits(d.wagerAmount, USDT_DECIMALS)),
        message: d.message,
        inviteHash: d.inviteHash,
        createdAt: d.createdAt,
        chainId: DEFAULT_CHAIN_ID,
      });
    }

    return open.reverse();
  }, [duelRecords]);

  return {
    duels,
    isLoading,
    isError,
  };
}
