import {
  encodeFunctionData,
  type Abi,
  type Account,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem';

export interface ResilientBroadcastArgs {
  walletClient: WalletClient<Transport, Chain, Account>;
  publicClient: PublicClient<Transport, Chain>;
  account: `0x${string}`;
  chainId: number;
  to: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  nonce: number;
}

// Splits a contract write into two RPC calls so the broadcast can use wagmi's
// fallback transport instead of the wallet's single-URL broadcast path.
//
// Why: Privy embedded wallets implement eth_sendTransaction as sign + broadcast
// internally, where the broadcast goes through a viem http() transport built
// from chain.rpcUrls.privyWalletOverride.http[0] — one URL, no fallback. When
// that single endpoint has any transient issue (provider 429, brief 5xx, network
// blip, ad-blocker, viem's 10s timeout firing on a slow response), the user
// sees "HTTP request failed" with no retry, even though Privy already signed
// the transaction successfully on the API side.
//
// By signing separately via the wallet's eth_signTransaction (which Privy
// handles in-API and never depends on the chain RPC) and then broadcasting via
// publicClient.sendRawTransaction (whose underlying transport is our
// fallback(configured provider → Tenderly → drpc → arb1.arbitrum.io) with retryCount: 1
// per URL), we get N transparent retries across distinct RPC providers instead
// of one shot at one provider.
//
// All gas parameters must be pre-filled by the caller — passing them explicitly
// also defeats Privy's all-zero-gas auto-populate bug (see useDuelActions
// writeWithGas / buildTransactionParams).
export async function broadcastWithFallback(params: ResilientBroadcastArgs): Promise<Hex> {
  const data = encodeFunctionData({
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
  });

  const signedTx = await params.walletClient.signTransaction({
    account: params.account,
    to: params.to,
    data,
    chainId: params.chainId,
    type: 'eip1559',
    gas: params.gas,
    maxFeePerGas: params.maxFeePerGas,
    maxPriorityFeePerGas: params.maxPriorityFeePerGas,
    nonce: params.nonce,
    value: 0n,
  });

  return params.publicClient.sendRawTransaction({
    serializedTransaction: signedTx,
  });
}
