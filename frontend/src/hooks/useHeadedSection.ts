'use client';

import { useCallback, useEffect, useState } from 'react';

/** How long the page has to stand still for a glide to count as over. */
const SETTLE_MS = 150;
/** The first wait is longer: the glide starts a frame or two after the click. */
const START_MS = 400;

/**
 * The section a link just sent the page to. The bar marks it while the page glides there, rather
 * than every section the reading band passes on the way, and keeps marking it once the page has
 * arrived, even a last section too short to reach the band. The reader's next scroll lets it go.
 */
export function useHeadedSection() {
  // Counted, so following the same link again holds it through the new glide as well.
  const [headed, setHeaded] = useState<{ id: string; round: number } | null>(null);
  const headTo = useCallback((id: string) => setHeaded((last) => ({ id, round: (last?.round ?? 0) + 1 })), []);

  useEffect(() => {
    if (headed === null) return;
    let hasArrived = false;
    const arrive = () => {
      hasArrived = true;
    };
    let settle = setTimeout(arrive, START_MS);
    const onScroll = () => {
      if (hasArrived) {
        setHeaded(null);
        return;
      }
      clearTimeout(settle);
      settle = setTimeout(arrive, SETTLE_MS);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(settle);
      window.removeEventListener('scroll', onScroll);
    };
  }, [headed]);

  return { headed: headed?.id ?? null, headTo };
}
