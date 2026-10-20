'use client';

import { skipToken, useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { LIVE_DATA_POLL_INTERVAL } from '@/lib/constants';
import { quoteFees, type FeeQuote } from '@/lib/gasNeeds';

/**
 * What a transaction costs per gas on `chainId` now, as the app's own writes would offer it, for a
 * signing window to say what the wallet will pay. Read only while `enabled`: the relayed path pays
 * nothing, so it never asks. Null until the network has answered.
 */
export function useFeeQuote(chainId: number, enabled: boolean): FeeQuote | null {
  const publicClient = usePublicClient({ chainId });
  const { data } = useQuery({
    queryKey: ['fee-quote', chainId],
    queryFn:
      enabled && publicClient
        ? async () => {
            const [fees, block] = await Promise.all([publicClient.estimateFeesPerGas(), publicClient.getBlock()]);
            return quoteFees(chainId, fees, block.baseFeePerGas);
          }
        : skipToken,
    refetchInterval: enabled ? LIVE_DATA_POLL_INTERVAL : false,
  });
  return data ?? null;
}
