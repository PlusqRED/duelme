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

/** One balance on one network: still being read, failed, or known. Never a guessed zero. */
export type BalanceReading =
  | { kind: 'checking' }
  | { kind: 'error' }
  | { kind: 'ready'; raw: bigint };

/** A balance, or that there is no wallet to read one for. */
export type BalanceStatus = { kind: 'no-wallet' } | BalanceReading;

export type FundingStatus =
  | { kind: 'unknown' }
  | { kind: 'enough' }
  | { kind: 'short'; shortfallRaw: bigint };

export function isSameBalanceKey(a: BalanceKey, b: BalanceKey): boolean {
  return a.chainId === b.chainId && a.walletAddress.toLowerCase() === b.walletAddress.toLowerCase();
}

/** What the screen may say about a balance a wallet may not be there for (`expected` null). */
export function resolveBalanceStatus(
  read: BalanceRead | null,
  expected: BalanceKey | null,
  freshSince = 0,
): BalanceStatus {
  return expected ? resolveBalanceReading(read, expected, freshSince) : { kind: 'no-wallet' };
}

/**
 * What the screen may say about a wallet's balance. Only a fresh answer becomes an amount: a successful
 * `balanceOf` for exactly `expected`, fetched after `freshSince` and after the wallet last changed,
 * not placeholder data carried over from another key. Anything older reads as "checking", because a
 * cached balance from before the top-up is exactly the number that would wave a short player through.
 *
 * A failed refetch is an error even when an earlier success is still cached — React Query keeps
 * `data` and flips `status` — and it stays one until a retry succeeds.
 */
export function resolveBalanceReading(
  read: BalanceRead | null,
  expected: BalanceKey,
  freshSince = 0,
): BalanceReading {
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
