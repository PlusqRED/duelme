'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Whether `target` has been on screen yet, by at least `threshold` of it; once it has, it stays
 * so. For a move that explains something the first time it is seen, like bars growing to their
 * share.
 */
export function useSeenOnce(target: RefObject<Element | null>, threshold: number): boolean {
  const [isSeen, setIsSeen] = useState(false);

  useEffect(() => {
    const node = target.current;
    if (isSeen || !node || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }
        observer.disconnect();
        setIsSeen(true);
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [target, threshold, isSeen]);

  return isSeen;
}
