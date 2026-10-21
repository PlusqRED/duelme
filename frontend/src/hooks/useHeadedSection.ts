'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

/** How long the page has to stand still for a glide to count as over. */
const SETTLE_MS = 150;
/** The first wait is longer: the glide starts a frame or two after the click. */
const START_MS = 400;
/** How far from where the glide stopped the page has to move before it counts as the reader's scroll. */
const DRIFT_PX = 2;

export interface HeadedSection {
  /** The section a followed link is taking the page to, or has taken it to; null when none. */
  headed: string | null;
  headTo: (id: string) => void;
}

/**
 * One hold for the whole top bar, so a link followed in the phone menu, which closes as it is
 * followed, still holds for the bar and for the menu opened again.
 */
export const HeadedSectionContext = createContext<HeadedSection>({ headed: null, headTo: () => {} });

export function useHeadedSectionContext(): HeadedSection {
  return useContext(HeadedSectionContext);
}

interface Hold {
  id: string;
  /** Counted, so following the same link again holds it through the new glide as well. */
  round: number;
  /** The page it was followed on: leaving it lets go. */
  pathname: string;
}

/**
 * The section a link just sent the page to. The bar marks it while the page glides there, rather
 * than every section the reading band passes on the way, and keeps marking it once the page has
 * arrived, even a last section too short to reach the band. The reader's own next scroll lets it
 * go, and so does leaving the page.
 */
export function useHeadedSection(): HeadedSection {
  const pathname = usePathname();
  const [hold, setHold] = useState<Hold | null>(null);
  if (hold && hold.pathname !== pathname) {
    setHold(null);
  }
  const headTo = useCallback(
    (id: string) => setHold((last) => ({ id, round: (last?.round ?? 0) + 1, pathname })),
    [pathname]
  );

  useEffect(() => {
    if (hold === null) return;
    /** Where the glide stopped; null while the page is still on its way. */
    let arrivedAt: number | null = null;
    const arrive = () => {
      arrivedAt = window.scrollY;
    };
    let settle = setTimeout(arrive, START_MS);
    const onScroll = () => {
      if (arrivedAt === null) {
        clearTimeout(settle);
        settle = setTimeout(arrive, SETTLE_MS);
        return;
      }
      // Measured from where the page stopped, not any scroll event: one can come with the page
      // still there, such as the glide's last frame landing just after the wait.
      if (Math.abs(window.scrollY - arrivedAt) > DRIFT_PX) setHold(null);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(settle);
      window.removeEventListener('scroll', onScroll);
    };
  }, [hold]);

  const headed = hold?.id ?? null;
  return useMemo(() => ({ headed, headTo }), [headed, headTo]);
}
