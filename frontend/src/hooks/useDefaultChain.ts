'use client';

import { useSyncExternalStore } from 'react';
import { getDefaultChainKey, type ChainKey } from '@/lib/defaultChain';

const SSR_DEFAULT: ChainKey = 'arbitrumSepolia';

function noopSubscribe(): () => void {
  return () => {};
}

function getServerSnapshot(): ChainKey {
  return SSR_DEFAULT;
}

export function useDefaultChain(): ChainKey {
  return useSyncExternalStore(noopSubscribe, getDefaultChainKey, getServerSnapshot);
}
