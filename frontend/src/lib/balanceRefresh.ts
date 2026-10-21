const BALANCE_REFRESH_EVENT = 'duelme:balance-refresh';

export function emitBalanceRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(BALANCE_REFRESH_EVENT));
}

export function emitBalanceRefreshBurst(delays = [0, 4_000, 12_000]) {
  if (typeof window === 'undefined') return;

  delays.forEach((delay) => {
    window.setTimeout(() => {
      window.dispatchEvent(new Event(BALANCE_REFRESH_EVENT));
    }, delay);
  });
}

export function subscribeToBalanceRefresh(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(BALANCE_REFRESH_EVENT, listener);
  return () => window.removeEventListener(BALANCE_REFRESH_EVENT, listener);
}

// The shared reads that already answered each event: every listener hears an event in the same tick.
const answeredBy = new WeakMap<Event, Set<string>>();

/**
 * Listens on behalf of a read that several mounted readers share under `key`. The first of them to
 * hear an event reads afresh, past a poll already running that may have read the chain before the
 * write's block; the rest join that read rather than restart it each.
 */
export function subscribeToSharedRefresh(key: string, read: { fresh: () => void; join: () => void }) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const listener = (event: Event) => {
    const answered = answeredBy.get(event) ?? new Set<string>();
    answeredBy.set(event, answered);
    if (answered.has(key)) {
      read.join();
      return;
    }
    answered.add(key);
    read.fresh();
  };
  window.addEventListener(BALANCE_REFRESH_EVENT, listener);
  return () => window.removeEventListener(BALANCE_REFRESH_EVENT, listener);
}
