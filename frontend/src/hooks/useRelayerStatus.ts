'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchRelayerStatus } from '@/lib/relayApi';
import { FORWARDER_ADDRESSES } from '@/lib/constants';

/**
 * Whether duel writes on `chainId` can go through the gas relayer.
 *
 * Both halves have to agree: the client needs a forwarder address for the chain (a
 * build-time constant, filled from the deploy artifacts) and the server needs a funded
 * relayer key. The probe answers the second half and is static for the life of the page,
 * so once it has answered it is never refetched.
 */
export function useRelayerStatus(chainId: number) {
  const forwarderAddress = FORWARDER_ADDRESSES[chainId];

  const { data, isFetched } = useQuery({
    queryKey: ['relayer-status'],
    queryFn: ({ signal }) => fetchRelayerStatus(signal),
    enabled: !!forwarderAddress,
    // A probe that fails outright reads as "relaying off" for the whole page and would send a
    // player without ETH down the self-paid path, so a failed request is tried again.
    retry: 2,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const isRelayEnabled = !!forwarderAddress && data?.available === true && data.chainId === chainId;

  return {
    isRelayEnabled,
    forwarderAddress,
    /** False only while the probe is still in flight, so UI never flashes the wrong badge. */
    isRelayResolved: !forwarderAddress || isFetched,
  };
}
