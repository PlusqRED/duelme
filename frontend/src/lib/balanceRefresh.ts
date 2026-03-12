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
