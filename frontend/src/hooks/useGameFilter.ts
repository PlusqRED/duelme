'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** How long the rows a pick takes away have to step out before the list changes. */
export const LEAVE_MS = 170;

/**
 * The game, by its slug, the recent duels are filtered to, or null for every game. `picked` follows
 * the click at once; `shown`, the one the list holds, follows it once the rows that go have stepped
 * out, or at once with motion reduced.
 */
export function useGameFilter() {
  const reducedMotion = useReducedMotion();
  const [picked, setPicked] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const pick = useCallback(
    (slug: string | null) => {
      setPicked(slug);
      clearTimeout(timer.current);
      if (reducedMotion) {
        setShown(slug);
        return;
      }
      timer.current = setTimeout(() => setShown(slug), LEAVE_MS);
    },
    [reducedMotion]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return { picked, shown, pick };
}
