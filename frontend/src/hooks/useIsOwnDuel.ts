'use client';

import { useCallback } from 'react';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { usePrivy } from '@privy-io/react-auth';

/**
 * Whether the reader made an open duel, so its card opens it rather than offering to join. Until a
 * signed-in reader's wallet is known their own duel cannot be told apart, so every duel counts as
 * theirs: open, not join.
 */
export function useIsOwnDuel(): (duel: { creator: string }) => boolean {
  const { authenticated } = usePrivy();
  const { walletAddress } = useActiveWallet();

  return useCallback(
    (duel) => authenticated && (!walletAddress || walletAddress === duel.creator.toLowerCase()),
    [authenticated, walletAddress]
  );
}
