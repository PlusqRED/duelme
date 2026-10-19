import type { BalanceStatus } from '@/lib/deposit';

/** One balance on one network: still being read, failed, or known. Never a guessed zero. */
export type BalanceReading = Exclude<BalanceStatus, { kind: 'no-wallet' }>;

interface MulticallBalanceResult {
  status: 'success' | 'failure';
  result?: unknown;
}

/**
 * Each network's USDT from one `useReadContracts` call, in the order the calls were made. A read
 * still loading or failed stays that, and a whole read that failed makes every network failed:
 * React Query keeps the last results after a failed refetch, and they are no longer the balance.
 */
export function usdtReadings(
  count: number,
  results: readonly MulticallBalanceResult[] | undefined,
  queryFailed: boolean
): BalanceReading[] {
  return Array.from({ length: count }, (_, index): BalanceReading => {
    if (queryFailed) {
      return { kind: 'error' };
    }
    const result = results?.[index];
    if (!result) {
      return { kind: 'checking' };
    }
    return result.status === 'success' && typeof result.result === 'bigint'
      ? { kind: 'ready', raw: result.result }
      : { kind: 'error' };
  });
}

interface BalanceQuery {
  status: 'pending' | 'error' | 'success';
  data?: { value: bigint };
}

/** A network's ETH from its `getBalance` query, read the same way. */
export function ethReading(query: BalanceQuery): BalanceReading {
  if (query.status === 'error') {
    return { kind: 'error' };
  }
  return query.status === 'success' && query.data ? { kind: 'ready', raw: query.data.value } : { kind: 'checking' };
}

/** The amount a reading holds, or null while it is not known. */
export function readingRaw(reading: BalanceReading): bigint | null {
  return reading.kind === 'ready' ? reading.raw : null;
}
