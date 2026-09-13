import { createPublicClient, createWalletClient, http, parseEther, type Account, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrum, arbitrumSepolia } from 'viem/chains';
import { DEFAULT_CHAIN, DEFAULT_CHAIN_ID, DUELME_ADDRESSES, FORWARDER_ADDRESSES } from '@/lib/constants';
import { parseUintString } from '@/lib/relayRequest';

/**
 * Server-side relayer wiring. Reads secrets from non-`NEXT_PUBLIC_` env, so nothing here
 * may be imported from a client component — the guard below turns a mistake into an
 * immediate crash instead of a bundle that silently ships an empty config.
 *
 * The relayer serves exactly one chain, the build's default. Supporting a second would
 * mean a second funded key, a second RPC and a second budget ledger for no benefit: dev
 * lists Arbitrum One only so testers can compare, and writes there stay self-paid.
 */
if (typeof window !== 'undefined') {
  throw new Error('relayerConfig is server-only');
}

/** Per address: ~0.0005 ETH covers dozens of L2 duel actions in a day. */
const DEFAULT_DAILY_BUDGET_WEI = parseEther('0.0005');

/**
 * Relayer-wide ceiling. Addresses are free to create, so the per-address budget alone does
 * not bound what a determined caller can drain — this does, at roughly a thousand L2 duel
 * actions a day. Raise it when real traffic justifies it, not before.
 */
const DEFAULT_GLOBAL_DAILY_BUDGET_WEI = parseEther('0.01');

const CHAIN_BY_ID: Record<number, Chain> = {
  [arbitrum.id]: arbitrum,
  [arbitrumSepolia.id]: arbitrumSepolia,
};

export interface RelayerConfig {
  chain: Chain;
  chainId: number;
  duelMeAddress: `0x${string}`;
  forwarderAddress: `0x${string}`;
  dailyBudgetWei: bigint;
  globalDailyBudgetWei: bigint;
  publicClient: ReturnType<typeof createPublicClient>;
  walletClient: ReturnType<typeof createWalletClient>;
  /** Kept alongside the client so send sites never have to assert it is present. */
  account: Account;
  relayerAddress: `0x${string}`;
}

export type RelayerConfigResult =
  | { ok: true; config: RelayerConfig }
  | { ok: false; reason: string };

let cached: RelayerConfigResult | undefined;

/**
 * Resolved once per process — the env is immutable for the container's lifetime, and the
 * viem clients are safe to share across requests.
 */
export function getRelayerConfig(): RelayerConfigResult {
  cached ??= buildRelayerConfig();
  return cached;
}

function buildRelayerConfig(): RelayerConfigResult {
  const privateKey = process.env.RELAYER_PRIVATE_KEY?.trim();
  if (!privateKey) {
    return { ok: false, reason: 'RELAYER_PRIVATE_KEY is not set.' };
  }

  const normalizedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalizedKey)) {
    return { ok: false, reason: 'RELAYER_PRIVATE_KEY is not a 32-byte hex key.' };
  }

  const chain = CHAIN_BY_ID[DEFAULT_CHAIN_ID];
  const duelMeAddress = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];
  const forwarderAddress = FORWARDER_ADDRESSES[DEFAULT_CHAIN_ID];

  if (!chain || !duelMeAddress) {
    return { ok: false, reason: `No DuelMe deployment recorded for chain ${DEFAULT_CHAIN_ID}.` };
  }

  if (!forwarderAddress) {
    return { ok: false, reason: `No ERC-2771 forwarder recorded for chain ${DEFAULT_CHAIN_ID}.` };
  }

  const dailyBudget = parseBudget(process.env.RELAYER_DAILY_BUDGET_WEI, DEFAULT_DAILY_BUDGET_WEI);
  if (dailyBudget === null) {
    return { ok: false, reason: 'RELAYER_DAILY_BUDGET_WEI must be a positive integer of wei.' };
  }

  const globalDailyBudget = parseBudget(
    process.env.RELAYER_GLOBAL_DAILY_BUDGET_WEI,
    DEFAULT_GLOBAL_DAILY_BUDGET_WEI
  );
  if (globalDailyBudget === null) {
    return { ok: false, reason: 'RELAYER_GLOBAL_DAILY_BUDGET_WEI must be a positive integer of wei.' };
  }

  // A server request carries no Origin header, so a browser-locked NEXT_PUBLIC_ RPC key
  // would be rejected here. RELAYER_RPC_URL is the server's own endpoint; the chain's
  // public RPC is the fallback.
  const transport = http(process.env.RELAYER_RPC_URL?.trim() || DEFAULT_CHAIN.rpc, {
    timeout: 10_000,
    retryCount: 2,
  });

  const account = privateKeyToAccount(normalizedKey as `0x${string}`);

  return {
    ok: true,
    config: {
      chain,
      chainId: DEFAULT_CHAIN_ID,
      duelMeAddress,
      forwarderAddress,
      dailyBudgetWei: dailyBudget,
      globalDailyBudgetWei: globalDailyBudget,
      publicClient: createPublicClient({ chain, transport }),
      walletClient: createWalletClient({ account, chain, transport }),
      account,
      relayerAddress: account.address,
    },
  };
}

function parseBudget(raw: string | undefined, fallback: bigint): bigint | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return fallback;
  }

  // Same accepted format as the request parser — a budget of 0 would disable relaying by
  // accident rather than on purpose, so it is rejected rather than honoured.
  const parsed = parseUintString(trimmed);

  return parsed === null || parsed === 0n ? null : parsed;
}
