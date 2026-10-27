'use client';

import { useCallback } from 'react';
import { useBlock, useReadContract } from 'wagmi';
import { useClockValue } from '@/hooks/useNow';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { USDT_ADDRESSES } from '@/lib/constants';
import { transferWithAuthorizationAbi } from '@/lib/contracts';
import { nextRelayedTransferAt, relayedTransferDay, relayedTransferNonce } from '@/lib/relayedTransfer';
import type { FreeTransferStatus } from '@/lib/sendUsdt';

/**
 * How often the chain's time and the day's nonce are read again while the Send view is open: the
 * day turns at UTC midnight, and another tab or device may spend the day's transfer.
 */
const STATUS_POLL_MS = 60_000;

/**
 * Whether the wallet's relayed transfer for today is still there on `chainId`: the token's own
 * record of the day's nonce, read where DuelMe relays. The day is the chain's latest block's, as
 * the authorization's is: a device clock a few minutes off around midnight would read another
 * day's nonce. Until that block is in, the status is unknown and the device's day stands in for
 * when the next one opens.
 */
export function useRelayedTransfer(chainId: number, address: `0x${string}` | undefined) {
  const { isRelayEnabled } = useRelayerStatus(chainId);
  const { data: block } = useBlock({
    chainId,
    query: { enabled: isRelayEnabled, refetchInterval: STATUS_POLL_MS, staleTime: STATUS_POLL_MS },
  });
  const deviceDay = useClockValue((nowSeconds) => relayedTransferDay(nowSeconds * 1000));
  const chainDay = block ? relayedTransferDay(Number(block.timestamp) * 1000) : undefined;
  const isRead = isRelayEnabled && !!address && chainDay !== undefined;
  const { data: isUsed, refetch } = useReadContract({
    address: USDT_ADDRESSES[chainId],
    abi: transferWithAuthorizationAbi,
    functionName: 'authorizationState',
    args: address && chainDay !== undefined ? [address, relayedTransferNonce(chainDay)] : undefined,
    chainId,
    query: { enabled: isRead, refetchInterval: STATUS_POLL_MS, staleTime: 0 },
  });

  const status: FreeTransferStatus = !isRelayEnabled ? 'off' : !isRead || isUsed === undefined ? 'unknown' : isUsed ? 'used' : 'available';
  // React Query's refetch runs even a disabled query; where nothing is read, nothing is read again.
  const refetchStatus = useCallback(async () => {
    if (isRead) {
      await refetch();
    }
  }, [isRead, refetch]);
  return { status, nextAt: nextRelayedTransferAt(chainDay ?? deviceDay), refetch: refetchStatus };
}
