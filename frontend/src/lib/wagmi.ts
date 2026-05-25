import { http } from 'wagmi';
import { createConfig } from '@privy-io/wagmi';
import { arbitrumSepolia, arbitrum } from 'wagmi/chains';
import { AVAILABLE_CHAIN_KEYS } from '@/lib/constants';

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

export const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
  },
});
