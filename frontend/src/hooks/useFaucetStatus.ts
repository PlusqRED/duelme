'use client';

import { skipToken, useQuery } from '@tanstack/react-query';
import { useIdentityToken } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { AVAILABLE_CHAINS } from '@/lib/constants';
import { getFaucetStatus } from '@/lib/faucetApi';

export const FAUCET_STATUS_KEY = 'faucet-status';

// The faucet gives only test money: a build that lists no test network never asks about it.
const HAS_TEST_NETWORK = AVAILABLE_CHAINS.some((chain) => chain.testnet);

/** Whether the faucet runs here, what it gives, and whether this wallet already has it. */
export function useFaucetStatus() {
  const { identityToken } = useIdentityToken();
  const { walletAddress } = useActiveWallet();

  return useQuery({
    queryKey: [FAUCET_STATUS_KEY, walletAddress],
    queryFn: HAS_TEST_NETWORK && identityToken && walletAddress ? () => getFaucetStatus(identityToken) : skipToken,
    staleTime: 60_000,
  });
}
