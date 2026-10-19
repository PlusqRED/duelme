import { DEFAULT_CHAIN_KEY, type ChainKey } from '@/lib/constants';

export type { ChainKey };

// Default chain is fixed at build time via NEXT_PUBLIC_DEFAULT_CHAIN_KEY.
// duelme.pro builds with `arbitrum`, dev.duelme.pro builds with `arbitrumSepolia`.
export function getDefaultChainKey(): ChainKey {
  return DEFAULT_CHAIN_KEY;
}
