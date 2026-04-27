import { PRODUCTION_HOSTNAME, type ChainKey } from '@/lib/constants';

export type { ChainKey };

export function getDefaultChainKey(): ChainKey {
  if (typeof window === 'undefined') return 'arbitrumSepolia';
  return window.location.hostname === PRODUCTION_HOSTNAME ? 'arbitrum' : 'arbitrumSepolia';
}

// Non-production hosts (dev.duelme.pro, localhost, preview) get testnet-only
// helpers like the MockUSDT faucet button. Production must never expose them.
export function isNonProductionHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname !== PRODUCTION_HOSTNAME;
}
