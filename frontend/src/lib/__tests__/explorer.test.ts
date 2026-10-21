import { describe, expect, it } from 'vitest';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { explorerLink } from '@/lib/explorer';

describe('explorerLink', () => {
  it('testExplorerLinkPointsAtTheTransactionOnItsChain', () => {
    const link = explorerLink(SUPPORTED_CHAINS.arbitrumSepolia.id, 'tx', '0xabc');

    expect(link).toBe(`${SUPPORTED_CHAINS.arbitrumSepolia.explorer}/tx/0xabc`);
  });

  it('testExplorerLinkPointsAtAnAddress', () => {
    const link = explorerLink(SUPPORTED_CHAINS.arbitrum.id, 'address', '0xdef');

    expect(link).toBe(`${SUPPORTED_CHAINS.arbitrum.explorer}/address/0xdef`);
  });

  it('testExplorerLinkKnowsNoOtherChain', () => {
    expect(explorerLink(1, 'tx', '0xabc')).toBeNull();
  });
});
