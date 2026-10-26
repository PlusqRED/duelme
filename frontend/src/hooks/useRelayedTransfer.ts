'use client';

import { useReadContract } from 'wagmi';
import { useClockValue } from '@/hooks/useNow';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { USDT_ADDRESSES } from '@/lib/constants';
import { transferWithAuthorizationAbi } from '@/lib/contracts';
import { relayedTransferDay, relayedTransferNonce, RELAYED_TRANSFER_DAY_MS } from '@/lib/relayedTransfer';
import type { FreeTransferStatus } from '@/lib/sendUsdt';

/**
 * Whether the wallet's relayed transfer for today is still there on `chainId`: the token's own
 * record of the day's nonce, read where DuelMe relays. The day turns over at UTC midnight, which
 * the clock re-renders for, and with it the nonce read.
 */
export function useRelayedTransfer(chainId: number, address: `0x${string}` | undefined) {
  const { isRelayEnabled } = useRelayerStatus(chainId);
  const day = useClockValue((nowSeconds) => relayedTransferDay(nowSeconds * 1000));
  const { data: isUsed, refetch } = useReadContract({
    address: USDT_ADDRESSES[chainId],
    abi: transferWithAuthorizationAbi,
    functionName: 'authorizationState',
    args: address ? [address, relayedTransferNonce(day)] : undefined,
    chainId,
    query: { enabled: isRelayEnabled && !!address, staleTime: 0 },
  });

  const status: FreeTransferStatus = !isRelayEnabled ? 'off' : isUsed === undefined ? 'unknown' : isUsed ? 'used' : 'available';
  return { status, nextAt: (day + 1) * RELAYED_TRANSFER_DAY_MS, refetch };
}
