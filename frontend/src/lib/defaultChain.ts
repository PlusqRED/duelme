import { DEFAULT_CHAIN_KEY, type ChainKey } from '@/lib/constants';

export type { ChainKey };

// Default chain is fixed at build time via NEXT_PUBLIC_DEFAULT_CHAIN_KEY.
// duelme.pro builds with `arbitrum`, dev.duelme.pro builds with `arbitrumSepolia`.
export function getDefaultChainKey(): ChainKey {
  return DEFAULT_CHAIN_KEY;
}

// Mirrors getDefaultChainKey — anything that gates testnet-only UI (faucet button,
// MockUSDT helpers) reads this. True when the build targets a non-prod chain.
export function isNonProductionHost(): boolean {
  return DEFAULT_CHAIN_KEY !== 'arbitrum';
}
