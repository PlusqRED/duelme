'use client';

import { useCallback, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { balanceOfAbi, getUsdtAddress } from '@/lib/contracts';
import { subscribeToBalanceRefresh } from '@/lib/balanceRefresh';
import type { BalanceRead } from '@/lib/deposit';

/** A player waiting for a transfer to land looks at this number; the header's 30 s is too slow. */
const DEPOSIT_BALANCE_POLL_INTERVAL = 10_000;

/**
 * One wallet's USDT balance on one chain, polled while `enabled` and refreshed by the
 * `balanceRefresh` bus. Returns the raw read for `resolveBalanceStatus` rather than a number, so the
 * caller decides what counts as fresh. `refetch` only reads — it never signs or sends anything.
 */
export function useUsdtBalance(
  chainId: number,
  walletAddress: `0x${string}` | undefined,
  enabled: boolean,
) {
  const usdtAddress = getUsdtAddress(chainId);
  const active = enabled && !!walletAddress && !!usdtAddress;

  const query = useReadContract({
    address: usdtAddress,
    abi: balanceOfAbi,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    chainId,
    query: {
      enabled: active,
      refetchInterval: DEPOSIT_BALANCE_POLL_INTERVAL,
      staleTime: 0,
      // One retry, so a dead RPC turns into "couldn't load" in seconds instead of after the
      // default three back-offs.
      retry: 1,
    },
  });

  const { refetch: refetchQuery } = query;
  const refetch = useCallback(() => {
    // React Query's refetch() ignores `enabled`, so the gate has to be here too.
    if (active) {
      void refetchQuery();
    }
  }, [active, refetchQuery]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    return subscribeToBalanceRefresh(refetch);
  }, [active, refetch]);

  const read: BalanceRead | null = walletAddress
    ? {
        key: { chainId, walletAddress },
        status: query.status,
        data: query.data,
        dataUpdatedAt: query.dataUpdatedAt,
        isFetchedAfterMount: query.isFetchedAfterMount,
        isPlaceholderData: query.isPlaceholderData,
        isFetching: query.isFetching,
      }
    : null;

  return { read, refetch };
}
