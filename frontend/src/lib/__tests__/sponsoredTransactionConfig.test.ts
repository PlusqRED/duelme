import { describe, expect, it } from 'vitest';
import { DUELME_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';
import {
  getSponsoredTransactionConfig,
  isSponsoredTransactionsConfigured,
  isSponsoredWriteAllowed,
  type SponsoredTransactionEnv,
} from '@/lib/sponsoredTransactionConfig';

const API_KEY = 'pimlico-api-key';
const ARBITRUM_POLICY = 'arb-policy';
const SEPOLIA_POLICY = 'sepolia-policy';

function env(overrides: SponsoredTransactionEnv = {}): SponsoredTransactionEnv {
  return {
    NEXT_PUBLIC_PIMLICO_API_KEY: API_KEY,
    NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM: ARBITRUM_POLICY,
    NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM_SEPOLIA: SEPOLIA_POLICY,
    ...overrides,
  };
}

describe('sponsored transaction config', () => {
  it('selects the chain-specific Arbitrum policy and bundler url', () => {
    const config = getSponsoredTransactionConfig(SUPPORTED_CHAINS.arbitrum.id, env());

    expect(config?.apiKey).toBe(API_KEY);
    expect(config?.sponsorshipPolicyId).toBe(ARBITRUM_POLICY);
    expect(config?.chain.id).toBe(SUPPORTED_CHAINS.arbitrum.id);
    expect(config?.bundlerUrl).toBe(
      `https://api.pimlico.io/v2/${SUPPORTED_CHAINS.arbitrum.id}/rpc?apikey=${API_KEY}`
    );
  });

  it('selects the chain-specific Arbitrum Sepolia policy', () => {
    const config = getSponsoredTransactionConfig(SUPPORTED_CHAINS.arbitrumSepolia.id, env());

    expect(config?.apiKey).toBe(API_KEY);
    expect(config?.sponsorshipPolicyId).toBe(SEPOLIA_POLICY);
    expect(config?.chain.id).toBe(SUPPORTED_CHAINS.arbitrumSepolia.id);
  });

  it('falls back to a shared policy id for local development', () => {
    const config = getSponsoredTransactionConfig(
      SUPPORTED_CHAINS.arbitrumSepolia.id,
      env({
        NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM: undefined,
        NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM_SEPOLIA: undefined,
        NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID: 'shared-policy',
      })
    );

    expect(config?.sponsorshipPolicyId).toBe('shared-policy');
  });

  it('stays disabled without an API key or policy id', () => {
    expect(
      isSponsoredTransactionsConfigured(
        SUPPORTED_CHAINS.arbitrum.id,
        env({ NEXT_PUBLIC_PIMLICO_API_KEY: '' })
      )
    ).toBe(false);
    expect(
      isSponsoredTransactionsConfigured(
        SUPPORTED_CHAINS.arbitrum.id,
        env({ NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM: '' })
      )
    ).toBe(false);
  });

  it('allows only expected DuelMe and token writes', () => {
    const chainId = SUPPORTED_CHAINS.arbitrum.id;

    expect(isSponsoredWriteAllowed(chainId, DUELME_ADDRESSES[chainId], 'createDuel')).toBe(true);
    expect(isSponsoredWriteAllowed(chainId, DUELME_ADDRESSES[chainId], 'joinDuel')).toBe(true);
    expect(isSponsoredWriteAllowed(chainId, DUELME_ADDRESSES[chainId], 'rescueETH')).toBe(false);
    expect(isSponsoredWriteAllowed(chainId, SUPPORTED_CHAINS.arbitrum.usdt, 'approve')).toBe(true);
    expect(isSponsoredWriteAllowed(chainId, SUPPORTED_CHAINS.arbitrum.usdt, 'transfer')).toBe(false);
    expect(
      isSponsoredWriteAllowed(chainId, '0x0000000000000000000000000000000000000001', 'createDuel')
    ).toBe(false);
  });
});
