import { describe, expect, it } from 'vitest';
import { getDefaultChainKey } from '../defaultChain';

describe('getDefaultChainKey', () => {
  it('falls back to arbitrumSepolia when NEXT_PUBLIC_DEFAULT_CHAIN_KEY is unset', () => {
    expect(getDefaultChainKey()).toBe('arbitrumSepolia');
  });
});
