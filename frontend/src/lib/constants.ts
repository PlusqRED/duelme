// Everything the app knows about a chain lives on its entry here — including the contract
// addresses, which are copied by hand from contracts/broadcast/*/run-latest.json after a
// redeploy. The chain-id-keyed records further down are DERIVED from these entries, never
// written out separately: a second hand-maintained map is what let getUsdtAddress go stale
// and sign permits against a dead token.
export const SUPPORTED_CHAINS = {
  arbitrumSepolia: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    shortName: 'Arb Sepolia',
    testnet: true,
    usdt: '0x9E317e8A4B943E31452902D0106F836369f8bb6F' as `0x${string}`,
    duelMe: '0x990aD70C168B184a84d6d9491303fa344154e317' as `0x${string}`,
    // ERC-2771 forwarder the DuelMe on this chain trusts. Omit it and the chain simply has
    // no relaying — /api/relay refuses it and duel writes stay self-paid.
    forwarder: '0x6bd063648f3B09fD111789Fd0194dc72eE44573E' as `0x${string}` | undefined,
    explorer: 'https://sepolia.arbiscan.io',
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    shortName: 'Arbitrum One',
    testnet: false,
    usdt: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as `0x${string}`,
    duelMe: '0xBd2266AB4b62E34FD5282608abeEEd425F6D7F22' as `0x${string}`,
    forwarder: undefined as `0x${string}` | undefined,
    explorer: 'https://arbiscan.io',
    rpc: 'https://arb1.arbitrum.io/rpc',
  },
} as const;

const ALL_CHAINS = Object.values(SUPPORTED_CHAINS);

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

// Fallback default for the on-chain minWager() (owner-adjustable). The live
// value is fetched by useContractConfig; this constant only covers the moment
// before that read resolves, so keep it equal to the deploy-time value.
export const MIN_WAGER = 0.3; // 0.3 USDT (display value)
export const MAX_WAGER_SLIDER = 500; // upper bound of the create-duel wager slider; text input still accepts larger values

// Chain ids where the backend-signed testnet faucet can operate.
// Used to gate the faucet button in the UI.
export const TESTNET_CHAIN_IDS: ReadonlySet<number> = new Set(
  ALL_CHAINS.filter((chain) => chain.testnet).map((chain) => chain.id)
);
// Fallback defaults for the owner-adjustable on-chain claimTimeout(),
// maxMessageCodepoints() and maxMessageBytes() — same rule as MIN_WAGER above.
export const CLAIM_TIMEOUT = 3600; // 1 hour in seconds
export const MAX_DUEL_MESSAGE_CHARACTERS = 32;
export const MAX_DUEL_MESSAGE_BYTES = 128;
export const USDT_DECIMALS = 6;

export const USDT_ADDRESSES: Record<number, `0x${string}`> = Object.fromEntries(
  ALL_CHAINS.map((chain) => [chain.id, chain.usdt])
);

export const DUELME_ADDRESSES: Record<number, `0x${string}`> = Object.fromEntries(
  ALL_CHAINS.map((chain) => [chain.id, chain.duelMe])
);

export const FORWARDER_ADDRESSES: Record<number, `0x${string}`> = Object.fromEntries(
  ALL_CHAINS.flatMap((chain) => (chain.forwarder ? [[chain.id, chain.forwarder] as const] : []))
);

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

export const CHAIN_NAMES: Record<number, string> = Object.fromEntries(
  ALL_CHAINS.map((chain) => [chain.id, chain.shortName])
);

export const SITE_URL = 'https://duelme.pro';
export const SITE_NAME = 'DuelMe';
