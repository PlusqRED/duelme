import { describe, expect, it } from 'vitest';
import { getDefaultChainKey, isNonProductionHost } from '../defaultChain';

describe('getDefaultChainKey', () => {
  it('falls back to arbitrumSepolia when NEXT_PUBLIC_DEFAULT_CHAIN_KEY is unset', () => {
    expect(getDefaultChainKey()).toBe('arbitrumSepolia');
  });
});

describe('isNonProductionHost', () => {
  it('is true when the build targets a non-arbitrum chain', () => {
    expect(isNonProductionHost()).toBe(true);
  });
});
