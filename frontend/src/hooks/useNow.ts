'use client';

import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  ticker ??= setInterval(() => listeners.forEach((notify) => notify()), 1000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(ticker);
      ticker = undefined;
    }
  };
}

function readNow(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * The time in whole seconds, from one clock that ticks once a second for every part of the screen
 * reading it. A reported win's time to answer then runs out on its own, between reads of the
 * contract, and every clock on the page shows the same second.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, readNow, readNow);
}

/**
 * A value read off the same clock that re-renders only when it changes: whether a deadline has
 * passed, or the seconds left only while a clock runs, rather than every part of a screen every
 * second. `select` must give a primitive, so equal readings compare equal.
 */
export function useClockValue<T extends string | number | boolean | null>(select: (now: number) => T): T {
  return useSyncExternalStore(subscribe, () => select(readNow()), () => select(readNow()));
}
