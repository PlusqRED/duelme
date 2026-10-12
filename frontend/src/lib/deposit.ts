import type { TranslationKey } from '@/i18n/translations';

/** Which balance a read answers: one wallet's USDT on one chain. */
export interface BalanceKey {
  chainId: number;
  walletAddress: string;
}

/** The parts of a React Query result for `balanceOf` that decide whether it can be trusted. */
export interface BalanceRead {
  key: BalanceKey;
  status: 'pending' | 'error' | 'success';
  data: bigint | undefined;
  dataUpdatedAt: number;
  /** Fetched since this observer mounted or last switched keys (i.e. since the wallet changed). */
  isFetchedAfterMount: boolean;
  isPlaceholderData: boolean;
  isFetching: boolean;
}

export type BalanceStatus =
  | { kind: 'no-wallet' }
  | { kind: 'checking' }
  | { kind: 'error' }
  | { kind: 'ready'; raw: bigint };

export type FundingStatus =
  | { kind: 'unknown' }
  | { kind: 'enough' }
  | { kind: 'short'; shortfallRaw: bigint };

export function isSameBalanceKey(a: BalanceKey, b: BalanceKey): boolean {
  return a.chainId === b.chainId && a.walletAddress.toLowerCase() === b.walletAddress.toLowerCase();
}

/**
 * What the screen may say about a balance. Only a fresh answer becomes an amount: a successful
 * `balanceOf` for exactly `expected`, fetched after `freshSince` and after the wallet last changed,
 * not placeholder data carried over from another key. Anything older reads as "checking", because a
 * cached balance from before the top-up is exactly the number that would wave a short player through.
 *
 * A failed refetch is an error even when an earlier success is still cached — React Query keeps
 * `data` and flips `status` — and it stays one until a retry succeeds.
 */
export function resolveBalanceStatus(
  read: BalanceRead | null,
  expected: BalanceKey | null,
  freshSince = 0,
): BalanceStatus {
  if (!expected) {
    return { kind: 'no-wallet' };
  }
  if (!read || !isSameBalanceKey(read.key, expected)) {
    return { kind: 'checking' };
  }
  if (read.status === 'error') {
    return read.isFetching ? { kind: 'checking' } : { kind: 'error' };
  }
  if (read.status !== 'success' || read.data === undefined || read.isPlaceholderData) {
    return { kind: 'checking' };
  }
  if (!read.isFetchedAfterMount || read.dataUpdatedAt < freshSince) {
    return { kind: 'checking' };
  }
  return { kind: 'ready', raw: read.data };
}

export function resolveFunding(balance: BalanceStatus, requiredRaw: bigint): FundingStatus {
  if (balance.kind !== 'ready') {
    return { kind: 'unknown' };
  }
  return balance.raw >= requiredRaw
    ? { kind: 'enough' }
    : { kind: 'short', shortfallRaw: requiredRaw - balance.raw };
}

export interface DepositInstruction {
  key: TranslationKey;
  /** Shown as a warning: the line that keeps real money off the wrong network. */
  warning: boolean;
}

export interface DepositCopyKeys {
  token: TranslationKey;
  instructions: DepositInstruction[];
  /** `null` until the relayer probe has answered, so the panel never flashes the wrong claim. */
  fees: TranslationKey | null;
}

/**
 * The deposit panel's wording. Mainnet names the token and network and leaves fees, minimums and
 * network support to the sender — no exchange names, no promise to recover a transfer, no "pick
 * another network". Testnet says plainly that real USDT does not belong there. The fee sentence
 * separates relayed duel actions and payouts from sending USDT out, which always takes ETH, and
 * never promises that the relayer is always up.
 */
export function getDepositCopyKeys(options: {
  testnet: boolean;
  isRelayResolved: boolean;
  isRelayEnabled: boolean;
}): DepositCopyKeys {
  return {
    token: options.testnet ? 'deposit.token.testnet' : 'deposit.token.mainnet',
    instructions: options.testnet
      ? [{ key: 'deposit.testnet.warning', warning: true }]
      : [
          { key: 'deposit.mainnet.send', warning: false },
          { key: 'deposit.mainnet.exact', warning: false },
          { key: 'deposit.mainnet.otherNetwork', warning: true },
        ],
    fees: !options.isRelayResolved
      ? null
      : options.isRelayEnabled
        ? 'deposit.fees.relayed'
        : 'deposit.fees.selfPaid',
  };
}

export type ChainBalance = { chainId: number } & Exclude<BalanceStatus, { kind: 'no-wallet' }>;

interface MulticallBalanceResult {
  status: 'success' | 'failure';
  result?: unknown;
}

/**
 * The wallet menu's per-chain balances, from one `useReadContracts` call. A chain still loading or
 * failed stays that — it is never shown as 0.00 — and the cross-chain total exists only once every
 * chain has an answer, so a failed read never quietly drops out of the sum.
 */
export function summarizeChainBalances(
  chainIds: readonly number[],
  results: readonly MulticallBalanceResult[] | undefined,
  queryFailed: boolean,
): { balances: ChainBalance[]; totalRaw: bigint | null } {
  const balances = chainIds.map((chainId, index): ChainBalance => {
    // A failed refetch keeps the previous results around; they are no longer the balance.
    if (queryFailed) {
      return { chainId, kind: 'error' };
    }
    const result = results?.[index];
    if (!result) {
      return { chainId, kind: 'checking' };
    }
    return result.status === 'success' && typeof result.result === 'bigint'
      ? { chainId, kind: 'ready', raw: result.result }
      : { chainId, kind: 'error' };
  });

  const totalRaw = balances.every((balance) => balance.kind === 'ready')
    ? balances.reduce((sum, balance) => sum + (balance.kind === 'ready' ? balance.raw : 0n), 0n)
    : null;

  return { balances, totalRaw };
}
