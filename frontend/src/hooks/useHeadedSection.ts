'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

/** How long the page has to stand still for a glide to count as over. */
const SETTLE_MS = 150;
/** The first wait is longer: the glide starts a frame or two after the click. */
const START_MS = 400;
/** The keys that scroll the page. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

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
    let hasArrived = false;
    const arrive = () => {
      hasArrived = true;
    };
    let settle = setTimeout(arrive, START_MS);
    // Once there, only the reader's own scrolling lets go: a wheel, a swipe or a scrolling key. A
    // scroll alone does not: the phone menu locking the page as it opens moves it by hundreds of
    // pixels, with nobody scrolling.
    const onReaderScroll = () => {
      if (hasArrived) setHold(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) onReaderScroll();
    };
    const onScroll = () => {
      if (hasArrived) return;
      clearTimeout(settle);
      settle = setTimeout(arrive, SETTLE_MS);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onReaderScroll, { passive: true });
    window.addEventListener('touchmove', onReaderScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(settle);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onReaderScroll);
      window.removeEventListener('touchmove', onReaderScroll);
      window.removeEventListener('keydown', onKey);
    };
  }, [hold]);

  const headed = hold?.id ?? null;
  return useMemo(() => ({ headed, headTo }), [headed, headTo]);
}
