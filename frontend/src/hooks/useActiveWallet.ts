'use client';

import { useMemo } from 'react';
import { useWallets } from '@privy-io/react-auth';

/**
 * Returns the active Privy wallet, preferring the embedded wallet over external ones.
 * Mirrors the logic in setActiveWalletForWagmi (Providers.tsx).
 *
 * - `walletAddress` is lowercased for comparisons (equality checks, contract calls).
 * - `activeWallet.address` preserves the original checksummed form for display.
 */
export function useActiveWallet() {
  const { wallets } = useWallets();

  const activeWallet = useMemo(
    () => wallets.find((w) => w.walletClientType === 'privy') ?? wallets[0] ?? null,
    [wallets],
  );

  const walletAddress = useMemo(
    () => activeWallet?.address?.toLowerCase() as `0x${string}` | undefined,
    [activeWallet],
  );

  return { activeWallet, walletAddress };
}
