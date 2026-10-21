'use client';

import { useEffect, useState } from 'react';

/** The band of the screen a section must cross to be the one being read: just above the middle. */
const READING_BAND = '-35% 0px -60% 0px';

/**
 * Which of the page's sections, by id, is being read: the first of them in a band just above the
 * middle of the screen, or null when none is, as at the top of the page. `ids` is a list kept
 * from render to render.
 */
export function useSectionInView(ids: readonly string[]): string | null {
  const [inView, setInView] = useState<string | null>(null);

  useEffect(() => {
    const sections = ids.flatMap((id) => document.getElementById(id) ?? []);
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const crossing = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            crossing.add(entry.target.id);
          } else {
            crossing.delete(entry.target.id);
          }
        }
        setInView(ids.find((id) => crossing.has(id)) ?? null);
      },
      { rootMargin: READING_BAND }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [ids]);

  return inView;
}
