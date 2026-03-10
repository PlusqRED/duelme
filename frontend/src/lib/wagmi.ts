import { http } from 'wagmi';
import { createConfig } from '@privy-io/wagmi';
import { arbitrumSepolia, arbitrum, polygon } from 'wagmi/chains';

export const supportedChains = [arbitrumSepolia, arbitrum, polygon] as const;

export const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [polygon.id]: http('https://polygon-rpc.com'),
  },
});
