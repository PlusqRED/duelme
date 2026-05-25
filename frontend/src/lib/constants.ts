export const SUPPORTED_CHAINS = {
  arbitrumSepolia: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    usdt: '0xbf345834d808a058e1278b50f3844aD86686f401' as `0x${string}`,
    explorer: 'https://sepolia.arbiscan.io',
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    usdt: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as `0x${string}`,
    explorer: 'https://arbiscan.io',
    rpc: 'https://arb1.arbitrum.io/rpc',
  },
} as const;

export type ChainKey = keyof typeof SUPPORTED_CHAINS;

// Default chain is chosen at build time via NEXT_PUBLIC_DEFAULT_CHAIN_KEY.
// CI sets it to `arbitrum` for prod (duelme.pro) and `arbitrumSepolia` for dev.
// Local builds without the env var fall back to testnet — safer default.
function resolveDefaultChainKey(): ChainKey {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_KEY;
  if (raw && (raw === 'arbitrum' || raw === 'arbitrumSepolia')) {
    return raw;
  }
  return 'arbitrumSepolia';
}

export const DEFAULT_CHAIN_KEY: ChainKey = resolveDefaultChainKey();
export const DEFAULT_CHAIN = SUPPORTED_CHAINS[DEFAULT_CHAIN_KEY];
export const DEFAULT_CHAIN_ID = DEFAULT_CHAIN.id;

// Chains a user can actually interact with in this build. Prod (Arbitrum One)
// locks down to mainnet only — no testnet switch, balance fetch, or wallet
// connect on Sepolia. Dev keeps both so testers can compare environments.
export const AVAILABLE_CHAIN_KEYS: readonly ChainKey[] =
  DEFAULT_CHAIN_KEY === 'arbitrum'
    ? (['arbitrum'] as const)
    : (['arbitrumSepolia', 'arbitrum'] as const);

export const AVAILABLE_CHAIN_IDS: readonly number[] = AVAILABLE_CHAIN_KEYS.map(
  (key) => SUPPORTED_CHAINS[key].id
);

export const MIN_WAGER = 3; // 3 USDT (display value)
export const MIN_WAGER_RAW = 3_000_000n; // 3 USDT in 6 decimals
export const MAX_WAGER_SLIDER = 500; // upper bound of the create-duel wager slider; text input still accepts larger values

// Chain ids where the backend-signed testnet faucet can operate.
// Used to gate the faucet button in the UI.
export const TESTNET_CHAIN_IDS: ReadonlySet<number> = new Set([
  SUPPORTED_CHAINS.arbitrumSepolia.id,
]);
export const CLAIM_TIMEOUT = 3600; // 1 hour in seconds
export const USDT_DECIMALS = 6;

export const DUELME_ADDRESSES: Record<number, `0x${string}`> = {
  421614: '0xc09bF9E3c458224675717c40fa2ACF28343E2A1c', // Arbitrum Sepolia
  42161: '0x0000000000000000000000000000000000000000', // Arbitrum One — populated after Deploy
};

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

export const CHAIN_NAMES: Record<number, string> = {
  421614: 'Arb Sepolia',
  42161: 'Arbitrum One',
};

export const SITE_URL = 'https://duelme.pro';
export const SITE_NAME = 'DuelMe';
