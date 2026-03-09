import { http, createConfig } from 'wagmi';
import { arbitrum, polygon } from 'wagmi/chains';

export const wagmiConfig = createConfig({
  chains: [arbitrum, polygon],
  transports: {
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [polygon.id]: http('https://polygon-rpc.com'),
  },
});
