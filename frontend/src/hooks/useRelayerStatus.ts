'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchRelayerStatus } from '@/lib/relayApi';
import { FORWARDER_ADDRESSES } from '@/lib/constants';
import type { RelayerStatus } from '@/lib/relayRequest';

/**
 * The probe of the server half. It is static for the life of the page: every reader shares the
 * one request, and once it has settled it is never asked again, so the route a flow planned with
 * cannot change under it.
 */
export const relayerStatusQuery = queryOptions({
  queryKey: ['relayer-status'],
  // Not cancelled with its last reader: an answer that arrives late is still the page's answer.
  queryFn: () => fetchRelayerStatus(),
  // A failed probe settles on "relaying off" for the page, which sends a player without ETH down
  // the self-paid path, so it is tried twice more first.
  retry: 2,
  // Offline it fails rather than waits, since duel writes wait for it.
  networkMode: 'always',
  retryOnMount: false,
  refetchOnReconnect: false,
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
    /** False while the probe is in flight, so UI never flashes the wrong badge. */
    isRelayResolved: !forwarderAddress || (isFetched && fetchStatus === 'idle'),
  };
}
