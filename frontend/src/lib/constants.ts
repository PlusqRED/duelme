export const SUPPORTED_CHAINS = {
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    usdt: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as `0x${string}`,
    explorer: 'https://arbiscan.io',
    rpc: 'https://arb1.arbitrum.io/rpc',
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as `0x${string}`,
    explorer: 'https://polygonscan.com',
    rpc: 'https://polygon-rpc.com',
  },
} as const;

export const MIN_WAGER = 3; // 3 USDT (display value)
export const MIN_WAGER_RAW = 3_000_000n; // 3 USDT in 6 decimals
export const CLAIM_TIMEOUT = 3600; // 1 hour in seconds
export const USDT_DECIMALS = 6;

// Contract addresses (placeholder — will be updated after deployment)
export const DUELME_ADDRESSES: Record<number, `0x${string}`> = {
  42161: '0x0000000000000000000000000000000000000000', // Arbitrum
  137: '0x0000000000000000000000000000000000000000', // Polygon
};

export const SITE_URL = 'https://duelme.fun';
export const SITE_NAME = 'DuelMe';
