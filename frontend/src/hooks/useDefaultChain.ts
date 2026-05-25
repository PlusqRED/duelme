'use client';

import { DEFAULT_CHAIN_KEY, type ChainKey } from '@/lib/constants';

// Default chain is now build-time constant — kept as a hook so existing call
// sites stay unchanged and we keep the option of returning derived state later.
export function useDefaultChain(): ChainKey {
  return DEFAULT_CHAIN_KEY;
}
