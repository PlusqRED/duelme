'use client';

import { useCallback, useEffect } from 'react';
import { useBalance } from 'wagmi';
import { subscribeToBalanceRefresh } from '@/lib/balanceRefresh';
import { LIVE_DATA_POLL_INTERVAL } from '@/lib/constants';
import type { BalanceReading } from '@/lib/balanceStatus';
import { balanceReading } from '@/lib/walletBalances';

/**
 * One wallet's ETH on one chain, for a signing window whose transactions the wallet pays for:
 * polled while `enabled`, and read again whenever a write or the faucet says a balance moved.
 * The wallet menu reads the same query, so both show one answer.
 */
export function useEthBalance(chainId: number, walletAddress: `0x${string}` | undefined, enabled: boolean) {
  const active = enabled && !!walletAddress;
  const query = useBalance({
    address: walletAddress,
    chainId,
    query: { enabled: active, refetchInterval: active ? LIVE_DATA_POLL_INTERVAL : false, staleTime: 0, retry: 1 },
  });

  const { refetch: refetchQuery } = query;
  const refetch = useCallback(() => {
    // React Query's refetch() ignores `enabled`, so the gate has to be here too.
    if (active) {
      void refetchQuery();
    }
  }, [active, refetchQuery]);

  useEffect(() => (active ? subscribeToBalanceRefresh(refetch) : undefined), [active, refetch]);

  const reading: BalanceReading = balanceReading({ status: query.status, data: query.data?.value });
  return { reading, refetch };
}
