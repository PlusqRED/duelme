import type { UnsignedTransactionRequest } from '@privy-io/react-auth';
import {
  BaseError,
  encodeFunctionData,
  FeeCapTooHighError,
  InsufficientFundsError,
  IntrinsicGasTooHighError,
  IntrinsicGasTooLowError,
  keccak256,
  NonceMaxValueError,
  TipAboveFeeCapError,
  toHex,
  TransactionTypeNotSupportedError,
  type Abi,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
} from 'viem';
import { getNodeError } from 'viem/utils';

/** EIP-1559's transaction type, as the number Privy's wallet API takes. */
const EIP1559_TRANSACTION_TYPE = 2;

export interface ResilientBroadcastArgs {
  /** Signs a transaction in the embedded wallet and returns it serialized, ready to broadcast. */
  signTransaction: (transaction: UnsignedTransactionRequest) => Promise<Hex>;
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
// By signing separately through Privy's signTransaction (which Privy
// handles in-API and never depends on the chain RPC) and then broadcasting via
// publicClient.sendRawTransaction (whose underlying transport is our
// fallback(configured provider → Tenderly → drpc → arb1.arbitrum.io) with retryCount: 1
// per URL), we get N transparent retries across distinct RPC providers instead
// of one shot at one provider.
//
// All gas parameters must be pre-filled by the caller — passing them explicitly
// also defeats Privy's all-zero-gas auto-populate bug (see useWriteWithGas
// writeWithGas / buildTransactionParams).
export async function broadcastWithFallback(params: ResilientBroadcastArgs): Promise<Hex> {
  const data = encodeFunctionData({
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
  });

  // Privy's transaction shape, not viem's: Privy hands it to its wallet API as it is, and the API
  // takes the type only as a number and refuses viem's RPC form, "0x2", with a 400. The limit
  // goes in as `gasLimit` because Privy also sends a `gas` as the gas price. Quantities are hex:
  // Privy's in-browser signer reads a numeric zero nonce as no nonce at all.
  const signedTx = await params.signTransaction({
    from: params.account,
    to: params.to,
    data,
    chainId: params.chainId,
    type: EIP1559_TRANSACTION_TYPE,
    gasLimit: toHex(params.gas),
    maxFeePerGas: toHex(params.maxFeePerGas),
    maxPriorityFeePerGas: toHex(params.maxPriorityFeePerGas),
    nonce: toHex(params.nonce),
    value: toHex(0n),
  });

  try {
    return await params.publicClient.sendRawTransaction({
      serializedTransaction: signedTx,
    });
  } catch (broadcastError) {
    // A broadcast can fail after the network already has the transaction: the first provider
    // forwards it and times out, and the next answers "already known" or "nonce too low". The
    // error alone would read as a write that never went out, and "Try again" would send it a
    // second time with a new nonce. Ask the network for the transaction itself before saying so.
    if (isRefusedOutright(broadcastError)) {
      throw broadcastError;
    }

    const hash = keccak256(signedTx);

    if (await isKnownToNetwork(params.publicClient, hash)) {
      return hash;
    }

    throw broadcastError;
  }
}

/**
 * Refusals that never answer a copy the network already took. Gas, fee caps, type and nonce range
 * are read off the signed bytes, the same in every copy, so a node that took one would have
 * refused it too. Funds are checked after the nonce, so a copy already taken reads as "already
 * known" or "nonce too low" first. A fee cap under the base fee is not among them: the base fee
 * moves, so a copy may have gone in before it rose.
 */
const OUTRIGHT_REFUSALS = [
  InsufficientFundsError,
  IntrinsicGasTooHighError,
  IntrinsicGasTooLowError,
  FeeCapTooHighError,
  TipAboveFeeCapError,
  TransactionTypeNotSupportedError,
  NonceMaxValueError,
];

function isRefusedOutright(broadcastError: unknown): boolean {
  if (!(broadcastError instanceof BaseError)) {
    return false;
  }

  const nodeError = getNodeError(broadcastError, {});
  return OUTRIGHT_REFUSALS.some((refusal) => nodeError instanceof refusal);
}

/** Lookups after a failed broadcast, spaced out because a provider can lag the sequencer briefly. */
const NETWORK_LOOKUPS = 3;
const NETWORK_LOOKUP_DELAY_MS = 1_000;

async function isKnownToNetwork(publicClient: PublicClient<Transport, Chain>, hash: Hex): Promise<boolean> {
  for (let lookup = 0; lookup < NETWORK_LOOKUPS; lookup++) {
    if (lookup > 0) {
      await new Promise((resolve) => setTimeout(resolve, NETWORK_LOOKUP_DELAY_MS));
    }

    try {
      await publicClient.getTransaction({ hash });
      return true;
    } catch {
      // Not found, or the lookup itself failed: either way the network has not shown it yet.
    }
  }

  return false;
}
