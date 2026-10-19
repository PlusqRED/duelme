'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** How long the rows a pick takes away have to step out before the list changes: `--leave`. */
export const LEAVE_MS = 170;

/**
 * The game, by its slug, the recent duels are filtered to, or null for every game. `picked` follows
 * the click at once; `shown`, the one the list holds, follows it once the rows that go have stepped
 * out (`isLeaving` until then), or at once with motion reduced. Picking the game already picked
 * shows every game again; `pick` says which it moved to.
 */
export function useGameFilter() {
  const reducedMotion = useReducedMotion();
  const [picked, setPicked] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const pick = useCallback(
    (slug: string | null): string | null => {
      const next = slug === picked ? null : slug;
      setPicked(next);
      clearTimeout(timer.current);
      if (reducedMotion) {
        setShown(next);
      } else {
        timer.current = setTimeout(() => setShown(next), LEAVE_MS);
      }
      return next;
    },
    [picked, reducedMotion]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return { picked, shown, isLeaving: picked !== shown && picked !== null, pick };
}
