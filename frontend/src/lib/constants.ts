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

export const PRODUCTION_HOSTNAME = 'duelme.pro';

export const DEFAULT_CHAIN_ID = SUPPORTED_CHAINS.arbitrumSepolia.id;

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
  42161: '0x0000000000000000000000000000000000000000', // Arbitrum One (TBD)
};

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

export const CHAIN_NAMES: Record<number, string> = {
  421614: 'Arb Sepolia',
  42161: 'Arbitrum One',
};

export const SITE_URL = 'https://duelme.pro';
export const SITE_NAME = 'DuelMe';
