'use client';

import { useMemo } from 'react';
import { useCapabilities } from 'wagmi';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { isSponsoredTransactionsConfigured } from '@/lib/sponsoredTransactionConfig';
import { supportsSponsoredWalletCalls } from '@/lib/sponsoredWalletCalls';
import { EMBEDDED_WALLET_CLIENT_TYPE } from '@/lib/walletSelection';

export interface SponsoredFeesState {
  /** Active wallet is the Privy embedded wallet (vs an external one). */
  isPrivyEmbedded: boolean;
  /** Privy embedded wallet + Pimlico env set — EIP-7702 sponsored path. */
  embeddedSponsored: boolean;
  /** External wallet reporting ERC-7677 paymasterService — EIP-5792 path. */
  externalSponsored: boolean;
  /** False only while the external capability probe is still in flight. */
  feesResolved: boolean;
}

/** Whether duel writes on `chainId` are gas-sponsored for the active wallet. */
export function useSponsoredFees(chainId: number): SponsoredFeesState {
  const { activeWallet, walletAddress } = useActiveWallet();
  const isPrivyEmbedded = activeWallet?.walletClientType === EMBEDDED_WALLET_CLIENT_TYPE;
  const configured = isSponsoredTransactionsConfigured(chainId);

  // wallet_getCapabilities is only meaningful for external wallets, and its
  // answer is static for a wallet+chain within a session — probe exactly once
  // (retry: false also keeps wallets that reject the method a single call).
  const probeEnabled = configured && !isPrivyEmbedded && !!walletAddress;
  const { data: capabilities, isFetched } = useCapabilities({
    account: walletAddress,
    chainId,
    query: {
      enabled: probeEnabled,
      retry: false,
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });

  const embeddedSponsored = configured && isPrivyEmbedded;
  const externalSponsored =
    configured && !isPrivyEmbedded && supportsSponsoredWalletCalls(capabilities);
  const feesResolved = !probeEnabled || isFetched;

  return useMemo(
    () => ({ isPrivyEmbedded, embeddedSponsored, externalSponsored, feesResolved }),
    [isPrivyEmbedded, embeddedSponsored, externalSponsored, feesResolved]
  );
}
