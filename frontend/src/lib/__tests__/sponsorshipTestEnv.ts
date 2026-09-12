import type { SponsoredTransactionEnv } from '@/lib/sponsoredTransactionConfig';

// Shared Pimlico env fixture for the sponsorship test files (config, errors,
// wallet-calls). Not a test file — vitest only collects *.test.ts.

export const PIMLICO_TEST_API_KEY = 'pimlico-api-key';
export const PIMLICO_TEST_ARBITRUM_POLICY = 'arb-policy';
export const PIMLICO_TEST_SEPOLIA_POLICY = 'sepolia-policy';

export function pimlicoTestEnv(
  overrides: SponsoredTransactionEnv = {}
): SponsoredTransactionEnv {
  return {
    NEXT_PUBLIC_PIMLICO_API_KEY: PIMLICO_TEST_API_KEY,
    NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM: PIMLICO_TEST_ARBITRUM_POLICY,
    NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM_SEPOLIA: PIMLICO_TEST_SEPOLIA_POLICY,
    ...overrides,
  };
}
