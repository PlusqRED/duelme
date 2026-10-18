'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchRelayerStatus } from '@/lib/relayApi';
import { FORWARDER_ADDRESSES } from '@/lib/constants';
import type { RelayerStatus } from '@/lib/relayRequest';

/**
 * The probe of the server half. It is static for the life of the page, so once it has answered
 * it is never refetched; until then every reader shares the one request in flight.
 */
export const relayerStatusQuery = queryOptions({
  queryKey: ['relayer-status'],
  // Not cancelled with its last reader: an answer that arrives late is still the page's answer.
  queryFn: () => fetchRelayerStatus(),
  // A probe that fails outright reads as "relaying off" for the whole page and would send a
  // player without ETH down the self-paid path, so a failed request is tried again.
  retry: 2,
  staleTime: Infinity,
  gcTime: Infinity,
});

/** Whether a probe answer lets duel writes on `chainId` go through the relayer. */
export function isRelayAvailable(status: RelayerStatus | undefined, chainId: number): boolean {
  return !!FORWARDER_ADDRESSES[chainId] && status?.available === true && status.chainId === chainId;
}

/**
 * Whether duel writes on `chainId` can go through the gas relayer.
 *
 * Both halves have to agree: the client needs a forwarder address for the chain (a
 * build-time constant, filled from the deploy artifacts) and the server needs a funded
 * relayer key, which the probe answers.
 */
export function useRelayerStatus(chainId: number) {
  const forwarderAddress = FORWARDER_ADDRESSES[chainId];

  const { data, isFetched, fetchStatus } = useQuery({ ...relayerStatusQuery, enabled: !!forwarderAddress });

  return {
    isRelayEnabled: isRelayAvailable(data, chainId),
    forwarderAddress,
    /**
     * False while the probe is in flight, so UI never flashes the wrong badge — including the
     * request a new reader starts after a probe that failed, which may yet answer "on".
     */
    isRelayResolved: !forwarderAddress || (isFetched && fetchStatus === 'idle'),
  };
}
