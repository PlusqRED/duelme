'use client';

import { useDuelRange } from '@/hooks/useDuelReads';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { owedTo, type Owed } from '@/lib/owed';

/**
 * What the contract keeps for this wallet on the network duels run on, from the same paged history
 * read the landing's figures and the duel lists share, so a page that already reads it asks for
 * nothing new. Null while it is read and after a read failed: a short list must not pass for a
 * smaller sum.
 *
 * Worked out on every render rather than memoised: a claim running out of time changes what is
 * owed without any change in the data.
 */
export function useOwed(walletAddress: `0x${string}`): Owed | null {
  const { duels, isLoading, isError } = useDuelRange({ chainId: DEFAULT_CHAIN_ID });
  return isLoading || isError ? null : owedTo(duels, walletAddress);
}
