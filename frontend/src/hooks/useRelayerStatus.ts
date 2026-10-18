'use client';

import { createContext, useContext } from 'react';
import { FORWARDER_ADDRESSES } from '@/lib/constants';
import { isRelayAvailable, type RelayerStatus } from '@/lib/relayRequest';

/**
 * The server's relayer status, handed down with the page by the root layout. Outside the
 * provider — a test rendering one hook — relaying reads as off.
 */
export const RelayerStatusContext = createContext<RelayerStatus>({ available: false, chainId: null });

/**
 * Whether duel writes on `chainId` can go through the gas relayer. Known from the first render:
 * the server reads its own relayer config as it renders the page, so no flow ever plans or
 * sends a write before the answer is in.
 */
export function useRelayerStatus(chainId: number) {
  const status = useContext(RelayerStatusContext);

  return {
    isRelayEnabled: isRelayAvailable(status, chainId),
    forwarderAddress: FORWARDER_ADDRESSES[chainId],
  };
}
