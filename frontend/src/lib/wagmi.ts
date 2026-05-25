import { http } from 'wagmi';
import { createConfig } from '@privy-io/wagmi';
import { arbitrumSepolia, arbitrum } from 'wagmi/chains';
import { DEFAULT_CHAIN_KEY } from '@/lib/constants';

// Order matters: wagmi treats the first chain as the connection default that
// embedded wallets / unsupported-chain prompts fall back to. Build flips this
// per environment via NEXT_PUBLIC_DEFAULT_CHAIN_KEY.
export const supportedChains =
  DEFAULT_CHAIN_KEY === 'arbitrum'
    ? ([arbitrum, arbitrumSepolia] as const)
    : ([arbitrumSepolia, arbitrum] as const);

export const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
  },
});
