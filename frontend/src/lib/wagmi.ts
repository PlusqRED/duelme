import { http, createConfig } from 'wagmi';
import { arbitrum, polygon } from 'wagmi/chains';

export const supportedChains = [arbitrum, polygon] as const;

export const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [polygon.id]: http('https://polygon-rpc.com'),
  },
});
