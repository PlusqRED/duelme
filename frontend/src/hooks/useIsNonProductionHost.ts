'use client';

import { isNonProductionHost } from '@/lib/defaultChain';

// Build-time constant now — wrapper hook kept so the call sites stay declarative.
export function useIsNonProductionHost(): boolean {
  return isNonProductionHost();
}
