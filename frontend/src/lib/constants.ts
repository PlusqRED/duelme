export const SUPPORTED_CHAINS = {
  arbitrumSepolia: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    usdt: '0xFF2405132F2C13099A68759d38BB812505e970C0' as `0x${string}`,
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

export const MIN_WAGER = 3; // 3 USDT (display value)
export const MIN_WAGER_RAW = 3_000_000n; // 3 USDT in 6 decimals
export const CLAIM_TIMEOUT = 3600; // 1 hour in seconds
export const USDT_DECIMALS = 6;

export const DUELME_ADDRESSES: Record<number, `0x${string}`> = {
  421614: '0xAb4D602f74ea2EB31336F163dCe5eE7C9983E4b9', // Arbitrum Sepolia
  42161: '0x0000000000000000000000000000000000000000', // Arbitrum One (TBD)
};

export const SITE_URL = 'https://duelme.fun';
export const SITE_NAME = 'DuelMe';
