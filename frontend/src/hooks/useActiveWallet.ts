'use client';

import { useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { selectWallet } from '@/lib/walletSelection';

/**
 * Returns the active wallet based on login method:
 * - Social login (Google/email) → Privy embedded wallet
 * - Wallet login (MetaMask) → external wallet
 *
 * `walletAddress` is lowercased for comparisons.
 * `activeWallet.address` preserves checksummed form for display.
 */
export function useActiveWallet() {
  const { user } = usePrivy();
  const { wallets } = useWallets();

  const activeWallet = useMemo(
    () => selectWallet(wallets, user),
    [wallets, user],
  );

  const walletAddress = useMemo(
    () => activeWallet?.address?.toLowerCase() as `0x${string}` | undefined,
    [activeWallet],
  );

  return { activeWallet, walletAddress };
}
