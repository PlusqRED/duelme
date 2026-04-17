import type { ChainKey } from '@/lib/constants';

export type { ChainKey };

const PRODUCTION_HOSTNAME = 'duelme.pro';

export function getDefaultChainKey(): ChainKey {
  if (typeof window === 'undefined') return 'arbitrumSepolia';
  return window.location.hostname === PRODUCTION_HOSTNAME ? 'arbitrum' : 'arbitrumSepolia';
}
