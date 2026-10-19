'use client';

import { useSyncExternalStore } from 'react';

/** How far the page scrolls before the top bar draws its lower edge. */
const SCROLLED_PX = 4;

function subscribe(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}

/** Whether the page has scrolled away from its top. False on the server and while hydrating. */
export function useIsScrolled(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.scrollY > SCROLLED_PX,
    () => false
  );
}
