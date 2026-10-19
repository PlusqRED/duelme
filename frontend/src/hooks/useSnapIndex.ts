'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Which card of a strip that scrolls sideways is in view: the leftmost one mostly on screen, as two
 * can be on a tablet. The strip's cards are its children; `count` changes when they do. Where the
 * strip does not scroll, every card is in view and it stays on the first.
 */
export function useSnapIndex(track: RefObject<HTMLElement | null>, count: number): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const node = track.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const cards = Array.from(node.children);
    const inView = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            inView.add(entry.target);
          } else {
            inView.delete(entry.target);
          }
        }
        const first = cards.findIndex((card) => inView.has(card));
        if (first !== -1) {
          setIndex(first);
        }
      },
      { root: node, threshold: 0.6 }
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [track, count]);

  return Math.min(index, Math.max(count - 1, 0));
}
