'use client';

import { useCallback, useSyncExternalStore } from 'react';

// One list per query, made the first time it is asked for: the snapshot is read on every render.
const lists = new Map<string, MediaQueryList>();

function mediaQueryList(query: string): MediaQueryList {
  let list = lists.get(query);
  if (!list) {
    list = window.matchMedia(query);
    lists.set(query, list);
  }
  return list;
}

/** Whether a media query matches. False on the server and while hydrating, so both render alike. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = mediaQueryList(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => mediaQueryList(query).matches,
    () => false
  );
}
