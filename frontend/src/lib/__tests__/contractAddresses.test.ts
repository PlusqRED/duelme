import { describe, expect, it } from 'vitest';
import {
  CHAIN_NAMES,
  DUELME_ADDRESSES,
  FORWARDER_ADDRESSES,
  SUPPORTED_CHAINS,
  USDT_ADDRESSES,
} from '@/lib/constants';
import { getUsdtAddress } from '@/lib/contracts';

/**
 * The per-chain-id records are derived from SUPPORTED_CHAINS, so "a map disagrees with the
 * chain config" is no longer representable and needs no test. What is left is the handful of
 * things deriving them cannot rule out.
 */
describe('chain-keyed constants', () => {
  const chains = Object.values(SUPPORTED_CHAINS);

  it('gives every chain a distinct id — the one way the derived maps can lose an entry', () => {
    const ids = chains.map((chain) => chain.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never points two chains at the same contract', () => {
    for (const addresses of [Object.values(USDT_ADDRESSES), Object.values(DUELME_ADDRESSES)]) {
      const lowered = addresses.map((address) => address.toLowerCase());

      expect(new Set(lowered).size).toBe(lowered.length);
    }
  });

  it('derives an entry per chain, and a forwarder only where one is configured', () => {
    expect(Object.keys(DUELME_ADDRESSES)).toHaveLength(chains.length);
    expect(Object.keys(CHAIN_NAMES)).toHaveLength(chains.length);
    // Sorted on both sides: these keys are integer-like, so Object.keys returns them in
    // ascending numeric order whatever order they were inserted in, while the chain list
    // keeps its own. The claim is which chains have an entry, never in what order — and
    // the difference only became visible once a second chain configured a forwarder.
    expect(Object.keys(FORWARDER_ADDRESSES).sort()).toEqual(
      chains
        .filter((chain) => chain.forwarder)
        .map((chain) => String(chain.id))
        .sort()
    );
  });

  it('has no USDT address for an unknown chain', () => {
    expect(getUsdtAddress(1)).toBeUndefined();
    expect(getUsdtAddress(undefined)).toBeUndefined();
  });
});
