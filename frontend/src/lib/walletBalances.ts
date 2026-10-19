import type { BalanceStatus } from '@/lib/deposit';

/** One balance on one network: still being read, failed, or known. Never a guessed zero. */
export type BalanceReading = Exclude<BalanceStatus, { kind: 'no-wallet' }>;

interface BalanceQuery {
  status: 'pending' | 'error' | 'success';
  data?: bigint;
}

/**
 * A network's balance from its query. A query that failed is failed even with an amount cached:
 * React Query keeps the last data after a failed refetch, and it is no longer the balance.
 */
export function balanceReading(query: BalanceQuery): BalanceReading {
  if (query.status === 'error') {
    return { kind: 'error' };
  }
  return query.status === 'success' && query.data !== undefined ? { kind: 'ready', raw: query.data } : { kind: 'checking' };
}

/** The amount a reading holds, or null while it is not known. */
export function readingRaw(reading: BalanceReading): bigint | null {
  return reading.kind === 'ready' ? reading.raw : null;
}

/** A reading as a person sees it: its amount, an ellipsis while it is read, a dash when the read failed. */
export function readingFigure(reading: BalanceReading, format: (raw: bigint) => string): string {
  if (reading.kind === 'ready') {
    return format(reading.raw);
  }
  return reading.kind === 'error' ? '—' : '…';
}
