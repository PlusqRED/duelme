'use client';

import { useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { useClockValue } from '@/hooks/useNow';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { USDT_ADDRESSES } from '@/lib/constants';
import { transferWithAuthorizationAbi } from '@/lib/contracts';
import { nextRelayedTransferAt, relayedTransferDay, relayedTransferNonce } from '@/lib/relayedTransfer';
import type { FreeTransferStatus } from '@/lib/sendUsdt';

/**
 * Whether the wallet's relayed transfer for today is still there on `chainId`: the token's own
 * record of the day's nonce, read where DuelMe relays. The day turns over at UTC midnight, which
 * the clock re-renders for, and with it the nonce read.
 */
export function useRelayedTransfer(chainId: number, address: `0x${string}` | undefined) {
  const { isRelayEnabled } = useRelayerStatus(chainId);
  const day = useClockValue((nowSeconds) => relayedTransferDay(nowSeconds * 1000));
  const isRead = isRelayEnabled && !!address;
  const { data: isUsed, refetch } = useReadContract({
    address: USDT_ADDRESSES[chainId],
    abi: transferWithAuthorizationAbi,
    functionName: 'authorizationState',
    args: address ? [address, relayedTransferNonce(day)] : undefined,
    chainId,
    query: { enabled: isRead, staleTime: 0 },
  });

  const status: FreeTransferStatus = !isRelayEnabled ? 'off' : isUsed === undefined ? 'unknown' : isUsed ? 'used' : 'available';
  // React Query's refetch runs even a disabled query; where nothing is read, nothing is read again.
  const refetchStatus = useCallback(async () => {
    if (isRead) {
      await refetch();
    }
  }, [isRead, refetch]);
  return { status, nextAt: nextRelayedTransferAt(day), refetch: refetchStatus };
}
