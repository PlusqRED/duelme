import { PRODUCTION_HOSTNAME, type ChainKey } from '@/lib/constants';

export type { ChainKey };

export function getDefaultChainKey(): ChainKey {
  if (typeof window === 'undefined') return 'arbitrumSepolia';
  return window.location.hostname === PRODUCTION_HOSTNAME ? 'arbitrum' : 'arbitrumSepolia';
}
