export const SUPPORTED_CHAINS = {
  arbitrumSepolia: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    usdt: '0xA3B04548Fce97260Ee32666AB2A2Fa61E57B078b' as `0x${string}`,
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

export const DUELME_ADDRESSES: Record<number, `0x${string}`> = {
  421614: '0x2789741566bc98b4f7C15BBdE84d511BE62eA200', // Arbitrum Sepolia
  42161: '0x0000000000000000000000000000000000000000', // Arbitrum One (TBD)
  137: '0x0000000000000000000000000000000000000000', // Polygon (TBD)
};

export const SITE_URL = 'https://duelme.fun';
export const SITE_NAME = 'DuelMe';
