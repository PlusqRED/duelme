import type { Chain } from 'viem';
import { arbitrum, arbitrumSepolia } from 'viem/chains';
import { DUELME_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';
import { getUsdtAddress } from '@/lib/contracts';

// Error code carried by SponsorshipUnavailableError (lib/sponsoredTransactions)
// and matched in guidedFlowRuntime. It lives in this dependency-light module so
// the guided-flow error mapper can import it without pulling in the
// permissionless / Pimlico module graph.
export const SPONSORSHIP_UNAVAILABLE_CODE = 'SPONSORSHIP_UNAVAILABLE';

export interface SponsoredTransactionEnv {
  NEXT_PUBLIC_PIMLICO_API_KEY?: string;
  NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID?: string;
  NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM?: string;
  NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM_SEPOLIA?: string;
}

export interface SponsoredTransactionConfig {
  apiKey: string;
  sponsorshipPolicyId: string;
  chain: Chain;
  bundlerUrl: string;
}

const CHAIN_BY_ID: Record<number, Chain> = {
  [SUPPORTED_CHAINS.arbitrum.id]: arbitrum,
  [SUPPORTED_CHAINS.arbitrumSepolia.id]: arbitrumSepolia,
};

// Allowlist of writes we are willing to route through the sponsored Pimlico
// path. This is UX hygiene only — the NEXT_PUBLIC_* Pimlico key is inlined into
// the JS bundle, so the real abuse control is the per-spender / per-policy
// spending caps configured on the Pimlico sponsorship policy.
const SPONSORED_DUELME_FUNCTIONS = new Set([
  'acceptMutualCancellation',
  'admitDefeat',
  'cancelDuel',
  'claimPayout',
  'claimPayouts',
  'claimVictory',
  'confirmResult',
  'createDuel',
  'declineDuel',
  'declineMutualCancellation',
  'disputeResult',
  'joinDuel',
  'refund',
  'refundAndClaimPayouts',
  'requestMutualCancellation',
  'withdrawMutualCancellationRequest',
]);

const SPONSORED_TOKEN_FUNCTIONS = new Set(['approve']);

function cleanEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function pimlicoBundlerUrl(chainId: number, apiKey: string): string {
  return `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${apiKey}`;
}

export function getDefaultSponsoredTransactionEnv(): SponsoredTransactionEnv {
  return {
    NEXT_PUBLIC_PIMLICO_API_KEY: process.env.NEXT_PUBLIC_PIMLICO_API_KEY,
    NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID:
      process.env.NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID,
    NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM:
      process.env.NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM,
    NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM_SEPOLIA:
      process.env.NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM_SEPOLIA,
  };
}

// NEXT_PUBLIC_* env is inlined at build time and immutable, so the default-env
// config is cached per chain — consumers call this every render. An explicit
// `env` (the test seam) bypasses the cache.
const defaultEnvConfigCache = new Map<number, SponsoredTransactionConfig | null>();

export function getSponsoredTransactionConfig(
  chainId: number,
  env?: SponsoredTransactionEnv
): SponsoredTransactionConfig | null {
  if (env) {
    return buildSponsoredTransactionConfig(chainId, env);
  }

  let cached = defaultEnvConfigCache.get(chainId);
  if (cached === undefined) {
    cached = buildSponsoredTransactionConfig(chainId, getDefaultSponsoredTransactionEnv());
    defaultEnvConfigCache.set(chainId, cached);
  }
  return cached;
}

function buildSponsoredTransactionConfig(
  chainId: number,
  env: SponsoredTransactionEnv
): SponsoredTransactionConfig | null {
  const chain = CHAIN_BY_ID[chainId];
  const apiKey = cleanEnvValue(env.NEXT_PUBLIC_PIMLICO_API_KEY);
  const sponsorshipPolicyId = getSponsorshipPolicyId(chainId, env);

  if (!chain || !apiKey || !sponsorshipPolicyId) {
    return null;
  }

  return {
    apiKey,
    sponsorshipPolicyId,
    chain,
    bundlerUrl: pimlicoBundlerUrl(chainId, apiKey),
  };
}

export function isSponsoredTransactionsConfigured(
  chainId: number,
  env?: SponsoredTransactionEnv
): boolean {
  return getSponsoredTransactionConfig(chainId, env) !== null;
}

export function isSponsoredWriteAllowed(
  chainId: number,
  address: `0x${string}` | undefined,
  functionName: string | undefined
): boolean {
  if (!address || !functionName) {
    return false;
  }

  const normalizedAddress = address.toLowerCase();
  const duelMeAddress = DUELME_ADDRESSES[chainId]?.toLowerCase();
  const usdtAddress = getUsdtAddress(chainId)?.toLowerCase();

  if (duelMeAddress && normalizedAddress === duelMeAddress) {
    return SPONSORED_DUELME_FUNCTIONS.has(functionName);
  }

  if (usdtAddress && normalizedAddress === usdtAddress) {
    return SPONSORED_TOKEN_FUNCTIONS.has(functionName);
  }

  return false;
}

function getSponsorshipPolicyId(
  chainId: number,
  env: SponsoredTransactionEnv
): string | undefined {
  if (chainId === SUPPORTED_CHAINS.arbitrum.id) {
    return cleanEnvValue(
      env.NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM ??
        env.NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID
    );
  }

  if (chainId === SUPPORTED_CHAINS.arbitrumSepolia.id) {
    return cleanEnvValue(
      env.NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM_SEPOLIA ??
        env.NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID
    );
  }

  return undefined;
}
