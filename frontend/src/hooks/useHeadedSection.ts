'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

/** How long the page has to stand still for a glide to count as over. */
const SETTLE_MS = 150;
/** The first wait is longer: the glide starts a frame or two after the click. */
const START_MS = 400;
/** How far the followed section has to move after the glide stopped for the move to be the reader's. */
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
    const target = document.getElementById(hold.id);
    // The links hold only a section of the page they are on.
    if (target === null) return;
    // The glide leaves the section's top just under the bar, the page's scroll padding down.
    const rest = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const gap = () => Math.abs(target.getBoundingClientRect().top - rest);
    /** The section's gap from that place when the glide stopped; null while the page is on its way. */
    let arrivedGap: number | null = null;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const waitForStill = (ms: number) => {
      clearTimeout(settle);
      settle = setTimeout(() => {
        arrivedGap = gap();
      }, ms);
    };
    waitForStill(START_MS);
    // Measured on the section, not the page: content loading above it moves the page but not the
    // section, and a glide that stalled past the wait goes on closer to it, not away.
    const onScroll = () => {
      if (arrivedGap === null) {
        waitForStill(SETTLE_MS);
        return;
      }
      const now = gap();
      if (now < arrivedGap - DRIFT_PX) {
        arrivedGap = null;
        waitForStill(SETTLE_MS);
      } else if (now > arrivedGap + DRIFT_PX) {
        setHold(null);
      }
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
