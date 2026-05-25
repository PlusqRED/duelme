import { fallback, http } from 'wagmi';
import { createConfig } from '@privy-io/wagmi';
import { arbitrum as arbitrumBase, arbitrumSepolia as arbitrumSepoliaBase } from 'wagmi/chains';
import { addRpcUrlOverrideToChain } from '@privy-io/chains';
import { AVAILABLE_CHAIN_KEYS } from '@/lib/constants';

// Privy embedded wallets DO NOT use the wagmi http() transport — they pull the
// RPC URL from the Chain object's rpcUrls. Without an override, Privy hits its
// own default RPC, which is rate-limited and intermittently fails with
// "Failed to fetch" / "HTTP request failed" under real user load. Patching the
// chain object via addRpcUrlOverrideToChain reroutes the embedded-wallet path
// to a reliable public node. For production scale, swap these for an Alchemy /
// QuickNode endpoint (set via env var if you want zero-redeploy switching).
const ARBITRUM_RPC = 'https://arbitrum-one-rpc.publicnode.com';
const ARBITRUM_SEPOLIA_RPC = 'https://arbitrum-sepolia-rpc.publicnode.com';

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

// wagmi reads from its own transports (NOT Chain.rpcUrls). We give it the same
// reliable nodes as the chain override, with the official Arbitrum RPC as a
// last-resort backstop for read calls.
export const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [arbitrumSepolia.id]: fallback([
      http(ARBITRUM_SEPOLIA_RPC),
      http('https://sepolia-rollup.arbitrum.io/rpc'),
    ]),
    [arbitrum.id]: fallback([
      http(ARBITRUM_RPC),
      http('https://arbitrum.drpc.org'),
      http('https://arb1.arbitrum.io/rpc'),
    ]),
  },
});
