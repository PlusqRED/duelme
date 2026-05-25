import { fallback, http } from 'wagmi';
import { createConfig } from '@privy-io/wagmi';
import { arbitrum as arbitrumBase, arbitrumSepolia as arbitrumSepoliaBase } from 'wagmi/chains';
import { addRpcUrlOverrideToChain } from '@privy-io/chains';
import { AVAILABLE_CHAIN_KEYS } from '@/lib/constants';

// Privy embedded wallets DO NOT use the wagmi http() transport — they pull the
// RPC URL from the Chain object's rpcUrls (single URL, no fallback). The chain
// override below is what every embedded-wallet transaction hits, so reliability
// of this single URL determines whether Privy ever shows "HTTP request failed".
//
// Resolution order (most reliable first):
//   1. NEXT_PUBLIC_ARBITRUM_RPC_URL — authenticated provider (Alchemy/QuickNode),
//      set per environment via GitHub secrets. Has rate limits high enough for
//      production and is the only option that survives traffic bursts.
//   2. Tenderly Gateway public — ~95% success on burst eth_calls, no
//      eth_fillTransaction, open CORS. Decent stopgap when the env var is unset
//      (e.g. local dev).
//
// Provider selection notes (measured May 2026):
//  - drpc.org: ~15% success on bursts of eth_call. Its "Temporary internal
//    error" responses are what Privy surfaces as "HTTP request failed". Kept
//    only as a wagmi-side fallback for read paths.
//  - arb1.arbitrum.io (Offchain Labs): rate-limited per IP, stable — backstop.
//  - arbitrum-one-rpc.publicnode.com: AVOIDED. Exposes legacy
//    eth_fillTransaction, which triggers https://github.com/wevm/viem/issues/4323
//    and produces signed transactions with all-zero gas/fees.
const TENDERLY_ARBITRUM = 'https://gateway.tenderly.co/public/arbitrum';
const TENDERLY_ARBITRUM_SEPOLIA = 'https://gateway.tenderly.co/public/arbitrum-sepolia';

// IMPORTANT: lock these URLs down via the Alchemy/QuickNode dashboard's
// "Allowed Origins" feature. NEXT_PUBLIC_* vars are inlined into the JS bundle,
// so the URL (and its key) is extractable — origin allowlist is what stops
// abuse.
const ARBITRUM_RPC = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || TENDERLY_ARBITRUM;
const ARBITRUM_SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || TENDERLY_ARBITRUM_SEPOLIA;

export const arbitrum = addRpcUrlOverrideToChain(arbitrumBase, ARBITRUM_RPC);
export const arbitrumSepolia = addRpcUrlOverrideToChain(arbitrumSepoliaBase, ARBITRUM_SEPOLIA_RPC);

const CHAIN_BY_KEY = {
  arbitrum,
  arbitrumSepolia,
} as const;

// Build-time list — order matters: wagmi treats the first chain as the
// connection default for embedded wallets and unsupported-chain prompts. Prod
// gets [arbitrum] only so the wallet UI can't drift onto testnet.
export const supportedChains = AVAILABLE_CHAIN_KEYS.map(
  (key) => CHAIN_BY_KEY[key]
) as unknown as readonly [typeof arbitrum | typeof arbitrumSepolia, ...(typeof arbitrum | typeof arbitrumSepolia)[]];

// wagmi reads from its own transports (NOT Chain.rpcUrls). Authenticated RPC
// first (if configured), then Tenderly, then less reliable public providers.
// All listed providers safely avoid the eth_fillTransaction bug.
//
// http() defaults: timeout 10s, retryCount 3 with exponential backoff. We
// tighten this so a stalled provider hands off to the next fallback within a
// few seconds rather than blocking the UI for ~30s.
const HTTP_OPTS = { timeout: 5_000, retryCount: 1 };

// Deduplicates URLs while preserving priority order. Important when the env
// var is unset and ARBITRUM_RPC collapses to TENDERLY_ARBITRUM — without
// dedup, the fallback would retry Tenderly twice in a row before reaching
// drpc, adding ~10s of dead time.
function buildFallbackTransports(...urls: string[]) {
  return [...new Set(urls)].map((url) => http(url, HTTP_OPTS));
}

export const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [arbitrumSepolia.id]: fallback(
      buildFallbackTransports(
        ARBITRUM_SEPOLIA_RPC,
        TENDERLY_ARBITRUM_SEPOLIA,
        'https://arbitrum-sepolia.drpc.org',
        'https://sepolia-rollup.arbitrum.io/rpc',
      )
    ),
    [arbitrum.id]: fallback(
      buildFallbackTransports(
        ARBITRUM_RPC,
        TENDERLY_ARBITRUM,
        'https://arbitrum.drpc.org',
        'https://arb1.arbitrum.io/rpc',
      )
    ),
  },
});
