'use client';

import { useEffect, useState } from 'react';

/** How long the network may take before the window offers a way out: well past an Arbitrum confirmation. */
export const TAKING_LONG_MS = 45_000;

/**
 * Whether a wait has gone on for `afterMs`: true from then until it ends. Each new wait starts from
 * zero, however the last one ended.
 */
export function useTakingLong(isWaiting: boolean, afterMs = TAKING_LONG_MS): boolean {
  const [wait, setWait] = useState({ isWaiting, round: 0 });
  const [longRound, setLongRound] = useState<number | null>(null);

  // A new wait is counted while rendering, so the round it belongs to is known in the same render.
  if (wait.isWaiting !== isWaiting) {
    setWait({ isWaiting, round: isWaiting ? wait.round + 1 : wait.round });
  }

  const { round } = wait;
  useEffect(() => {
    if (!isWaiting) {
      return undefined;
    }
    const timer = setTimeout(() => setLongRound(round), afterMs);
    return () => clearTimeout(timer);
  }, [isWaiting, round, afterMs]);

  return isWaiting && longRound === round;
}
