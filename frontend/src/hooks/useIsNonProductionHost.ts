'use client';

import { useSyncExternalStore } from 'react';
import { isNonProductionHost } from '@/lib/defaultChain';

function noopSubscribe(): () => void {
  return () => {};
}

function getServerSnapshot(): boolean {
  return false;
}

// Returns `true` only on non-production hosts (dev.duelme.pro, localhost).
// SSR returns `false` so production-only code paths never flash during hydration.
export function useIsNonProductionHost(): boolean {
  return useSyncExternalStore(noopSubscribe, isNonProductionHost, getServerSnapshot);
}
