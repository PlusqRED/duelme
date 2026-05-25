import { fallback, http } from 'wagmi';
import { createConfig } from '@privy-io/wagmi';
import { arbitrum as arbitrumBase, arbitrumSepolia as arbitrumSepoliaBase } from 'wagmi/chains';
import { addRpcUrlOverrideToChain } from '@privy-io/chains';
import { AVAILABLE_CHAIN_KEYS } from '@/lib/constants';

// Privy embedded wallets DO NOT use the wagmi http() transport — they pull the
// RPC URL from the Chain object's rpcUrls. Without an override, Privy hits its
// own default RPC, which is rate-limited and fails under load.
//
// IMPORTANT: do NOT swap these for arbitrum-one-rpc.publicnode.com. That
// endpoint exposes the legacy `eth_fillTransaction` JSON-RPC method, which
// viem's `prepareTransactionRequest` then calls — and the response leaks
// `gasPrice: "0x0"` alongside the EIP-1559 fee fields, producing a signed
// transaction with all-zero gas. Privy's UI shows a successful estimate but
// the resulting broadcast fails. See https://github.com/wevm/viem/issues/4323.
// drpc.org and the official Offchain Labs RPC do NOT implement
// eth_fillTransaction, so viem follows the EIP-1559 happy path.
// For production scale, swap these for an Alchemy / QuickNode endpoint that
// also avoids exposing eth_fillTransaction.
const ARBITRUM_RPC = 'https://arbitrum.drpc.org';
const ARBITRUM_SEPOLIA_RPC = 'https://arbitrum-sepolia.drpc.org';

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

// wagmi reads from its own transports (NOT Chain.rpcUrls). drpc first, official
// Offchain Labs RPC as a backstop. Both safely avoid the eth_fillTransaction
// bug. publicnode is intentionally absent.
export const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [arbitrumSepolia.id]: fallback([
      http(ARBITRUM_SEPOLIA_RPC),
      http('https://sepolia-rollup.arbitrum.io/rpc'),
    ]),
    [arbitrum.id]: fallback([
      http(ARBITRUM_RPC),
      http('https://arb1.arbitrum.io/rpc'),
    ]),
  },
});
